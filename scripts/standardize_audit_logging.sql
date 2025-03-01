-- Standardize audit logging system with {SOURCE}_{ACTION}_{ENTITY} pattern

-- 1. Update log_table_change function
CREATE OR REPLACE FUNCTION log_table_change()
RETURNS TRIGGER AS $$
DECLARE
    release_id_val INTEGER := NULL;
    user_alias_val TEXT := NULL;
    source_val TEXT := 'SYSTEM'; -- Default source is SYSTEM
    action_val TEXT;
    entity_val TEXT;
BEGIN
    -- Determine entity from table name
    CASE TG_TABLE_NAME
        WHEN 'releases' THEN entity_val := 'RECORD';
        WHEN 'reservations' THEN entity_val := 'RESERVATION';
        WHEN 'reservation_queue' THEN entity_val := 'QUEUE';
        WHEN 'cart_items' THEN entity_val := 'CART';
        WHEN 'sessions' THEN entity_val := 'SESSION';
        ELSE entity_val := TG_TABLE_NAME;
    END CASE;
    
    -- Determine action from operation
    CASE TG_OP
        WHEN 'INSERT' THEN action_val := 'CREATE';
        WHEN 'UPDATE' THEN action_val := 'UPDATE';
        WHEN 'DELETE' THEN action_val := 'DELETE';
        ELSE action_val := TG_OP;
    END CASE;
    
    -- Extract release_id with explicit type conversion for each table
    IF TG_TABLE_NAME = 'releases' THEN
        IF TG_OP = 'DELETE' THEN
            release_id_val := OLD.id;
        ELSE
            release_id_val := NEW.id;
        END IF;
    ELSIF TG_TABLE_NAME = 'reservations' THEN
        IF TG_OP = 'DELETE' THEN
            -- Explicit cast to INTEGER to avoid type issues
            release_id_val := OLD.release_id::INTEGER;
        ELSE
            release_id_val := NEW.release_id::INTEGER;
        END IF;
    ELSIF TG_TABLE_NAME = 'reservation_queue' THEN
        IF TG_OP = 'DELETE' THEN
            -- Explicit cast to INTEGER to avoid type issues
            release_id_val := OLD.release_id::INTEGER;
        ELSE
            release_id_val := NEW.release_id::INTEGER;
        END IF;
    ELSIF TG_TABLE_NAME = 'cart_items' THEN
        IF TG_OP = 'DELETE' THEN
            -- Explicit cast to INTEGER to avoid type issues
            release_id_val := OLD.release_id::INTEGER;
        ELSE
            release_id_val := NEW.release_id::INTEGER;
        END IF;
    END IF;
    
    -- Extract user_alias with proper handling for each table
    IF TG_TABLE_NAME = 'sessions' THEN
        IF TG_OP = 'DELETE' THEN
            user_alias_val := OLD.user_alias;
        ELSE
            user_alias_val := NEW.user_alias;
        END IF;
    ELSIF TG_TABLE_NAME IN ('reservations', 'reservation_queue', 'cart_items') THEN
        IF TG_OP = 'DELETE' THEN
            user_alias_val := OLD.user_alias;
        ELSE
            user_alias_val := NEW.user_alias;
        END IF;
    END IF;
    
    -- Insert audit log with safely handled values and standardized action format
    INSERT INTO audit_logs (
        release_id,
        user_alias,
        action,
        details,
        created_at
    ) VALUES (
        release_id_val,  -- Explicitly typed as INTEGER
        user_alias_val,
        source_val || '_' || action_val || '_' || entity_val,
        jsonb_build_object(
            'old_data', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
            'new_data', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
            'table', TG_TABLE_NAME,
            'timestamp', now()
        ),
        now()
    );
    
    -- Return the appropriate value based on operation type
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Update mark_record_as_sold function
CREATE OR REPLACE FUNCTION mark_record_as_sold(
    p_release_id INTEGER,
    p_admin_alias TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  -- First, log the action before making changes (to avoid trigger issues)
  INSERT INTO audit_logs (
      release_id,
      user_alias,
      action,
      details
  ) VALUES (
      p_release_id,
      p_admin_alias,
      'ADMIN_MARK_SOLD_RECORD',
      jsonb_build_object(
          'notes', p_notes,
          'timestamp', now()
      )
  );

  -- Use dynamic SQL to delete reservations and queue entries
  -- This bypasses the triggers and avoids type issues
  EXECUTE 'DELETE FROM reservations WHERE release_id = $1' USING p_release_id;
  EXECUTE 'DELETE FROM reservation_queue WHERE release_id = $1' USING p_release_id;
  
  -- Update release with visibility field
  UPDATE releases
  SET 
    sold_at = now(),
    sold_by = p_admin_alias,
    admin_notes = COALESCE(p_notes, admin_notes),
    visibility = FALSE
  WHERE id = p_release_id;
END;
$$ LANGUAGE plpgsql;

-- 3. Update admin_expire_reservation function
CREATE OR REPLACE FUNCTION admin_expire_reservation(
    p_reservation_id UUID,
    p_admin_alias TEXT
)
RETURNS VOID AS $$
DECLARE
    r_release_id INTEGER;
    r_user_alias TEXT;
    next_user TEXT;
    next_queue_id UUID;
BEGIN
    -- Get the reservation details safely
    SELECT release_id, user_alias INTO r_release_id, r_user_alias
    FROM reservations
    WHERE id = p_reservation_id
    AND status = 'RESERVED';
    
    -- If reservation doesn't exist or isn't in RESERVED status, exit
    IF r_release_id IS NULL THEN
        RAISE EXCEPTION 'Reservation not found or not in RESERVED status';
    END IF;
    
    -- Find the next person in queue using INTEGER release_id
    SELECT id, user_alias INTO next_queue_id, next_user
    FROM reservation_queue
    WHERE release_id = r_release_id
    AND queue_position = 1
    LIMIT 1;
    
    -- Log manually before making changes
    INSERT INTO audit_logs (release_id, user_alias, action, details)
    VALUES (
        r_release_id,
        p_admin_alias,
        'ADMIN_EXPIRE_RESERVATION',
        jsonb_build_object(
            'reservation_id', p_reservation_id,
            'expired_user', r_user_alias,
            'next_in_queue', next_user
        )
    );
    
    -- Delete the current reservation using dynamic SQL to bypass triggers
    EXECUTE 'DELETE FROM reservations WHERE id = $1' USING p_reservation_id;
    
    -- Only if someone is in queue, promote them
    IF next_user IS NOT NULL THEN
        -- Delete them from the queue directly using dynamic SQL
        IF next_queue_id IS NOT NULL THEN
            EXECUTE 'DELETE FROM reservation_queue WHERE id = $1' USING next_queue_id;
        END IF;
        
        -- Update remaining queue positions
        EXECUTE 'UPDATE reservation_queue 
                 SET queue_position = queue_position - 1
                 WHERE release_id = $1 AND queue_position > 1' 
        USING r_release_id;
        
        -- Create a new reservation
        INSERT INTO reservations (release_id, user_alias, status, expires_at)
        VALUES (r_release_id, next_user, 'RESERVED', now() + interval '7 days');
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. Update handle_reservation_expiry function
CREATE OR REPLACE FUNCTION handle_reservation_expiry()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.expires_at < now() THEN
        -- Move to next in queue if exists
        WITH next_in_queue AS (
            DELETE FROM reservation_queue
            WHERE release_id = OLD.release_id
            AND queue_position = 1
            RETURNING user_alias
        )
        INSERT INTO reservations (release_id, user_alias, status, expires_at)
        SELECT OLD.release_id, user_alias, 'RESERVED', now() + interval '7 days'
        FROM next_in_queue;
        
        -- Log the expiry
        INSERT INTO audit_logs (release_id, user_alias, action, details)
        VALUES (
            OLD.release_id,
            OLD.user_alias,
            'SYSTEM_EXPIRE_RESERVATION',
            jsonb_build_object(
                'expires_at', OLD.expires_at,
                'next_in_queue', (
                    SELECT user_alias FROM reservation_queue 
                    WHERE release_id = OLD.release_id 
                    AND queue_position = 1
                )
            )
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Add a migration function to standardize existing logs
CREATE OR REPLACE FUNCTION standardize_existing_audit_logs()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER := 0;
    source_val TEXT;
    action_val TEXT;
    entity_val TEXT;
BEGIN
    -- Update MARK_SOLD
    UPDATE audit_logs
    SET action = 'ADMIN_MARK_SOLD_RECORD'
    WHERE action = 'MARK_SOLD';
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    
    -- Update MARKED_AS_SOLD
    UPDATE audit_logs
    SET action = 'ADMIN_MARK_SOLD_RECORD'
    WHERE action = 'MARKED_AS_SOLD';
    
    -- Update EXPIRE_RESERVATION_ADMIN
    UPDATE audit_logs
    SET action = 'ADMIN_EXPIRE_RESERVATION'
    WHERE action = 'EXPIRE_RESERVATION_ADMIN';
    
    -- Update RESERVATION_EXPIRED
    UPDATE audit_logs
    SET action = 'SYSTEM_EXPIRE_RESERVATION'
    WHERE action = 'RESERVATION_EXPIRED';
    
    -- Update TERMINATE_SESSION
    UPDATE audit_logs
    SET action = 'ADMIN_TERMINATE_SESSION'
    WHERE action = 'TERMINATE_SESSION';
    
    -- Update INSERT_* operations
    UPDATE audit_logs
    SET action = 'SYSTEM_CREATE_' || 
        CASE 
            WHEN action LIKE 'INSERT_releases' THEN 'RECORD'
            WHEN action LIKE 'INSERT_reservations' THEN 'RESERVATION'
            WHEN action LIKE 'INSERT_reservation_queue' THEN 'QUEUE'
            WHEN action LIKE 'INSERT_cart_items' THEN 'CART'
            WHEN action LIKE 'INSERT_sessions' THEN 'SESSION'
            ELSE REPLACE(SUBSTRING(action FROM 8), '_', '')
        END
    WHERE action LIKE 'INSERT_%';
    
    -- Update UPDATE_* operations
    UPDATE audit_logs
    SET action = 'SYSTEM_UPDATE_' || 
        CASE 
            WHEN action LIKE 'UPDATE_releases' THEN 'RECORD'
            WHEN action LIKE 'UPDATE_reservations' THEN 'RESERVATION'
            WHEN action LIKE 'UPDATE_reservation_queue' THEN 'QUEUE'
            WHEN action LIKE 'UPDATE_cart_items' THEN 'CART'
            WHEN action LIKE 'UPDATE_sessions' THEN 'SESSION'
            ELSE REPLACE(SUBSTRING(action FROM 8), '_', '')
        END
    WHERE action LIKE 'UPDATE_%';
    
    -- Update DELETE_* operations
    UPDATE audit_logs
    SET action = 'SYSTEM_DELETE_' || 
        CASE 
            WHEN action LIKE 'DELETE_releases' THEN 'RECORD'
            WHEN action LIKE 'DELETE_reservations' THEN 'RESERVATION'
            WHEN action LIKE 'DELETE_reservation_queue' THEN 'QUEUE'
            WHEN action LIKE 'DELETE_cart_items' THEN 'CART'
            WHEN action LIKE 'DELETE_sessions' THEN 'SESSION'
            ELSE REPLACE(SUBSTRING(action FROM 8), '_', '')
        END
    WHERE action LIKE 'DELETE_%';
    
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Execute the function to standardize existing logs
SELECT standardize_existing_audit_logs();
