-- SQL Query to get all user questions to digital twin apps
-- Digital twins are apps where isMe = true
-- User questions are messages where role = 'user'

SELECT 
    m.id AS message_id,
    m.role,
    m.content AS question_content,
    m."uniqueId" AS message_unique_id,
    m."createdAt" AS question_created_at,
    m."updatedAt" AS question_updated_at,
    m.attachments,
    m."toolName",
    m."toolCallId",
    m."toolResults",
    
    -- Conversation information
    c.id AS conversation_id,
    c.title AS conversation_title,
    c."uniqueId" AS conversation_unique_id,
    c."userId" AS conversation_user_id,
    c."createdAt" AS conversation_created_at,
    
    -- User information (who sent the message)
    u.id AS user_id,
    u.name AS user_name,
    u.email AS user_email,
    u.avatar AS user_avatar,
    u."createdAt" AS user_created_at,
    
    -- Digital Twin App information
    a.id AS app_id,
    a.name AS app_name,
    a."uniqueId" AS app_unique_id,
    a."displayName" AS app_display_name,
    a.description AS app_description,
    a.logo AS app_logo,
    a."userId" AS app_owner_user_id,
    a."isMe" AS is_digital_twin,
    a."createdAt" AS app_created_at
    
FROM messages m
INNER JOIN conversations c ON m."conversationId" = c.id
INNER JOIN apps a ON c."appId" = a.id
LEFT JOIN users u ON c."userId" = u.id
WHERE 
    a."isMe" = true  -- Filter for digital twin apps
    AND m.role = 'user'  -- Filter for user questions
ORDER BY m."createdAt" DESC;  -- Most recent questions first

-- Alternative: If you want to filter by a specific digital twin app
-- WHERE a."isMe" = true 
--   AND m.role = 'user'
--   AND a."uniqueId" = 'your-app-unique-id'  -- Replace with specific app uniqueId

-- Alternative: If you want to filter by a specific user's questions
-- WHERE a."isMe" = true 
--   AND m.role = 'user'
--   AND u.id = 123  -- Replace with specific user ID
--   OR u.email = 'user@example.com'  -- Or filter by email

-- Alternative: Get count of questions per digital twin
-- SELECT 
--     a.id AS app_id,
--     a."displayName" AS app_name,
--     COUNT(m.id) AS total_questions
-- FROM apps a
-- INNER JOIN conversations c ON c."appId" = a.id
-- INNER JOIN messages m ON m."conversationId" = c.id
-- WHERE a."isMe" = true AND m.role = 'user'
-- GROUP BY a.id, a."displayName"
-- ORDER BY total_questions DESC;

-- Alternative: Get count of questions per user for digital twins
-- SELECT 
--     u.id AS user_id,
--     u.name AS user_name,
--     u.email AS user_email,
--     COUNT(m.id) AS total_questions,
--     COUNT(DISTINCT a.id) AS digital_twins_asked
-- FROM users u
-- INNER JOIN conversations c ON c."userId" = u.id
-- INNER JOIN messages m ON m."conversationId" = c.id
-- INNER JOIN apps a ON c."appId" = a.id
-- WHERE a."isMe" = true AND m.role = 'user'
-- GROUP BY u.id, u.name, u.email
-- ORDER BY total_questions DESC;

