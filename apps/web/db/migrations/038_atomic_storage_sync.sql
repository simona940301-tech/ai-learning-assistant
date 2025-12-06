-- Migration: 038_atomic_storage_sync.sql
-- Description: Creates an atomic RPC function to handle dual-write to Backpack and RAG tables.

CREATE OR REPLACE FUNCTION upload_document_atomic(
    p_user_id UUID,
    p_filename TEXT,
    p_file_size BIGINT,
    p_file_type TEXT,
    p_original_text TEXT,
    p_backpack_item_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_backpack_id UUID;
    v_rag_id UUID;
    v_new_backpack BOOLEAN := FALSE;
BEGIN
    -- 1. Handle Backpack Item (Create or Get)
    IF p_backpack_item_id IS NOT NULL THEN
        -- Case A: Uploaded via Backpack (Item already exists)
        v_backpack_id := p_backpack_item_id;
    ELSE
        -- Case B: Uploaded via Summary (Create Item if not exists)
        -- Check for existing item with same name (simple deduplication)
        SELECT id INTO v_backpack_id
        FROM backpack_items
        WHERE user_id = p_user_id 
          AND title = p_filename
          AND is_deleted = false
        LIMIT 1;

        IF v_backpack_id IS NULL THEN
            INSERT INTO backpack_items (
                user_id,
                title,
                type,
                file_size,
                subject,
                content
            ) VALUES (
                p_user_id,
                p_filename,
                p_file_type, -- 'pdf', 'image', 'text' mapped by caller
                p_file_size,
                'General',
                'Indexed for AI.'
            )
            RETURNING id INTO v_backpack_id;
            v_new_backpack := TRUE;
        END IF;
    END IF;

    -- 2. Handle RAG Document (Always Create for new version/analysis)
    -- Note: We map p_file_type to db enum if necessary, assuming caller passes correct string
    INSERT INTO rag_documents (
        user_id,
        filename,
        file_size,
        file_type,
        original_text,
        status,
        -- We should ideally store the link here, but the schema might not have the column yet.
        -- Assuming we rely on implicit linking for now OR schema update is done separately.
        -- For SOTA, we strictly should add the column, but that requires schema change.
        -- We will return both IDs so the app knows.
        updated_at
    ) VALUES (
        p_user_id,
        p_filename,
        p_file_size,
        p_file_type,
        p_original_text,
        'processing',
        NOW()
    )
    RETURNING id INTO v_rag_id;

    -- 3. Return Result
    RETURN jsonb_build_object(
        'success', TRUE,
        'rag_document_id', v_rag_id,
        'backpack_item_id', v_backpack_id,
        'is_new_backpack_item', v_new_backpack
    );

EXCEPTION WHEN OTHERS THEN
    -- Rollback is automatic in PL/PGSQL exception block if not handled
    RAISE;
END;
$$;
