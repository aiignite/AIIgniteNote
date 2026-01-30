-- ============================================================
-- AI Ignite Note 数据库设计
-- 版本: 1.0
-- 创建日期: 2026-01-16
-- 描述: 完整的AI智能笔记应用数据库
-- ============================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

-- ============================================================
-- 创建 Schema
-- ============================================================

CREATE SCHEMA IF NOT EXISTS public;
ALTER SCHEMA public OWNER TO postgres;
COMMENT ON SCHEMA public IS 'AI Ignite Note 主Schema';

-- ============================================================
-- 枚举类型定义
-- ============================================================

CREATE TYPE public."NoteType" AS ENUM (
    'MARKDOWN',
    'RICHTEXT',
    'MINDMAP',
    'FLOWCHART'
);

CREATE TYPE public."UserRole" AS ENUM (
    'OWNER',
    'ADMIN',
    'EDITOR',
    'VIEWER'
);

CREATE TYPE public."WorkspaceRole" AS ENUM (
    'OWNER',
    'ADMIN',
    'EDITOR',
    'VIEWER'
);

-- ============================================================
-- 触发器函数 - 全文搜索优化
-- ============================================================

CREATE FUNCTION public.update_note_content_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    COALESCE(NEW.content, '')
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_note_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    COALESCE(NEW.title, '')
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_tag_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    COALESCE(NEW.name, '')
  );
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.update_folder_search_vector() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple', 
    COALESCE(NEW.name, '')
  );
  RETURN NEW;
END;
$$;

-- ============================================================
-- 用户认证相关表
-- ============================================================

CREATE TABLE public.users (
    id text NOT NULL,
    name text,
    email text,
    "emailVerified" timestamp(3) without time zone,
    image text,
    password text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastLoginAt" timestamp(3) without time zone,
    "isActive" boolean DEFAULT true NOT NULL
);

CREATE TABLE public.accounts (
    id text NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    provider text NOT NULL,
    "providerAccountId" text NOT NULL,
    refresh_token text,
    access_token text,
    expires_at integer,
    token_type text,
    scope text,
    id_token text,
    session_state text
);

CREATE TABLE public.sessions (
    id text NOT NULL,
    "sessionToken" text NOT NULL,
    "userId" text NOT NULL,
    expires timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastActiveAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.verification_tokens (
    identifier text NOT NULL,
    token text NOT NULL,
    expires timestamp(3) without time zone NOT NULL
);

-- ============================================================
-- 工作空间/团队协作表
-- ============================================================

CREATE TABLE public.workspaces (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    "ownerId" text NOT NULL,
    "avatar" text,
    "maxMembers" integer DEFAULT 10,
    "isPublic" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.workspace_members (
    id text NOT NULL,
    "workspaceId" text NOT NULL,
    "userId" text NOT NULL,
    role public."WorkspaceRole" DEFAULT 'VIEWER'::public."WorkspaceRole" NOT NULL,
    "joinedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- 文件夹表
-- ============================================================

CREATE TABLE public.folders (
    id text NOT NULL,
    name text NOT NULL,
    "parentId" text,
    "workspaceId" text,
    "authorId" text NOT NULL,
    "icon" text DEFAULT 'folder',
    "color" text DEFAULT '#6b7280',
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    searchVector tsvector
);

-- ============================================================
-- 标签表
-- ============================================================

CREATE TABLE public.tags (
    id text NOT NULL,
    name text NOT NULL,
    color text DEFAULT '#6b7280',
    "workspaceId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    searchVector tsvector
);

-- ============================================================
-- 笔记表
-- ============================================================

CREATE TABLE public.notes (
    id text NOT NULL,
    title text NOT NULL,
    type public."NoteType" DEFAULT 'MARKDOWN'::public."NoteType" NOT NULL,
    "authorId" text NOT NULL,
    "workspaceId" text,
    "folderId" text,
    "isFavorite" boolean DEFAULT false NOT NULL,
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "viewCount" integer DEFAULT 0 NOT NULL,
    searchVector tsvector
);

CREATE TABLE public.note_contents (
    id text NOT NULL,
    "noteId" text NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    searchVector tsvector
);

CREATE TABLE public.notes_on_tags (
    "noteId" text NOT NULL,
    "tagId" text NOT NULL
);

-- ============================================================
-- 笔记版本历史表
-- ============================================================

CREATE TABLE public.note_versions (
    id text NOT NULL,
    "noteId" text NOT NULL,
    "contentId" text NOT NULL,
    version integer NOT NULL,
    "changeNote" text,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- 附件管理表
-- ============================================================

CREATE TABLE public.attachments (
    id text NOT NULL,
    "noteId" text NOT NULL,
    "fileName" text NOT NULL,
    "fileUrl" text NOT NULL,
    "fileSize" integer,
    "mimeType" text,
    "fileHash" text,
    "uploadedBy" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- 最近搜索表
-- ============================================================

CREATE TABLE public.recent_searches (
    id text NOT NULL,
    "userId" text NOT NULL,
    query text NOT NULL,
    "searchType" text DEFAULT 'all',
    "resultCount" integer DEFAULT 0,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- AI 功能相关表
-- ============================================================

CREATE TABLE public.ai_conversations (
    id text NOT NULL,
    "userId" text NOT NULL,
    "workspaceId" text,
    title text,
    "model" text DEFAULT 'gemini-pro',
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.ai_messages (
    id text NOT NULL,
    "conversationId" text NOT NULL,
    role text NOT NULL,
    content text NOT NULL,
    "tokens" integer,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE public.ai_templates (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    prompt text NOT NULL,
    category text DEFAULT 'General',
    "icon" text DEFAULT 'auto_awesome',
    "isActive" boolean DEFAULT true NOT NULL,
    "isPublic" boolean DEFAULT false NOT NULL,
    "userId" text,
    "workspaceId" text,
    "usageCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- 用户设置表
-- ============================================================

CREATE TABLE public.user_settings (
    id text NOT NULL,
    "userId" text NOT NULL,
    theme text DEFAULT 'system'::text NOT NULL,
    "defaultNoteType" public."NoteType" DEFAULT 'MARKDOWN'::public."NoteType" NOT NULL,
    "aiModelPreference" text,
    "sidebarWidth" integer DEFAULT 380 NOT NULL,
    "assistantPanelOpen" boolean DEFAULT true NOT NULL,
    "assistantPanelWidth" integer DEFAULT 360 NOT NULL,
    "language" text DEFAULT 'zh-CN' NOT NULL,
    "timezone" text DEFAULT 'Asia/Shanghai' NOT NULL,
    "notificationsEnabled" boolean DEFAULT true NOT NULL,
    "autoSaveInterval" integer DEFAULT 30 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- ============================================================
-- 创建主键约束
-- ============================================================

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.tags
    ADD CONSTRAINT tags_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.note_contents
    ADD CONSTRAINT note_contents_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notes_on_tags
    ADD CONSTRAINT notes_on_tags_pkey PRIMARY KEY ("noteId", "tagId");

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT note_versions_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.recent_searches
    ADD CONSTRAINT recent_searches_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT ai_conversations_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT ai_messages_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.ai_templates
    ADD CONSTRAINT ai_templates_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT user_settings_pkey PRIMARY KEY (id);

-- ============================================================
-- 创建唯一索引
-- ============================================================

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX accounts_provider_providerAccountId_key ON public.accounts USING btree (provider, "providerAccountId");
CREATE UNIQUE INDEX sessions_sessionToken_key ON public.sessions USING btree ("sessionToken");
CREATE UNIQUE INDEX tags_name_workspaceId_key ON public.tags USING btree (name, "workspaceId") WHERE name IS NOT NULL;
CREATE UNIQUE INDEX user_settings_userId_key ON public.user_settings USING btree ("userId");
CREATE UNIQUE INDEX workspace_members_workspaceId_userId_key ON public.workspace_members USING btree ("workspaceId", "userId");
CREATE UNIQUE INDEX verification_tokens_identifier_token_key ON public.verification_tokens USING btree (identifier, token);
CREATE UNIQUE INDEX verification_tokens_token_key ON public.verification_tokens USING btree (token);

-- ============================================================
-- 创建性能优化索引
-- ============================================================

-- 笔记搜索索引
CREATE INDEX notes_search_vector_idx ON public.notes USING gin (searchVector);
CREATE INDEX notes_authorId_idx ON public.notes USING btree ("authorId");
CREATE INDEX notes_workspaceId_idx ON public.notes USING btree ("workspaceId");
CREATE INDEX notes_folderId_idx ON public.notes USING btree ("folderId");
CREATE INDEX notes_isDeleted_idx ON public.notes USING btree ("isDeleted");
CREATE INDEX notes_isFavorite_idx ON public.notes USING btree ("isFavorite");
CREATE INDEX notes_createdAt_idx ON public.notes USING btree ("createdAt" DESC);
CREATE INDEX notes_updatedAt_idx ON public.notes USING btree ("updatedAt" DESC);

-- 笔记内容搜索索引
CREATE INDEX note_contents_search_vector_idx ON public.note_contents USING gin (searchVector);
CREATE INDEX note_contents_noteId_idx ON public.note_contents USING btree ("noteId");

-- 文件夹搜索索引
CREATE INDEX folders_search_vector_idx ON public.folders USING gin (searchVector);
CREATE INDEX folders_authorId_idx ON public.folders USING btree ("authorId");
CREATE INDEX folders_parentId_idx ON public.folders USING btree ("parentId");
CREATE INDEX folders_workspaceId_idx ON public.folders USING btree ("workspaceId");

-- 标签搜索索引
CREATE INDEX tags_search_vector_idx ON public.tags USING gin (searchVector);
CREATE INDEX tags_workspaceId_idx ON public.tags USING btree ("workspaceId");

-- 工作空间索引
CREATE INDEX workspaces_ownerId_idx ON public.workspaces USING btree ("ownerId");
CREATE INDEX workspaces_isPublic_idx ON public.workspaces USING btree ("isPublic");

-- 工作空间成员索引
CREATE INDEX workspace_members_userId_idx ON public.workspace_members USING btree ("userId");
CREATE INDEX workspace_members_workspaceId_idx ON public.workspace_members USING btree ("workspaceId");

-- 附件索引
CREATE INDEX attachments_noteId_idx ON public.attachments USING btree ("noteId");
CREATE INDEX attachments_uploadedBy_idx ON public.attachments USING btree ("uploadedBy");

-- 笔记版本索引
CREATE INDEX note_versions_noteId_idx ON public.note_versions USING btree ("noteId");
CREATE INDEX note_versions_version_idx ON public.note_versions USING btree ("noteId", version DESC);

-- AI对话索引
CREATE INDEX ai_conversations_userId_idx ON public.ai_conversations USING btree ("userId");
CREATE INDEX ai_conversations_workspaceId_idx ON public.ai_conversations USING btree ("workspaceId");

-- AI消息索引
CREATE INDEX ai_messages_conversationId_idx ON public.ai_messages USING btree ("conversationId");

-- AI模板索引
CREATE INDEX ai_templates_userId_idx ON public.ai_templates USING btree ("userId");
CREATE INDEX ai_templates_workspaceId_idx ON public.ai_templates USING btree ("workspaceId");
CREATE INDEX ai_templates_category_idx ON public.ai_templates USING btree (category);

-- 最近搜索索引
CREATE INDEX recent_searches_userId_idx ON public.recent_searches USING btree ("userId");
CREATE INDEX recent_searches_createdAt_idx ON public.recent_searches USING btree ("createdAt" DESC);

-- 用户会话索引
CREATE INDEX sessions_userId_idx ON public.sessions USING btree ("userId");
CREATE INDEX sessions_expires_idx ON public.sessions USING btree (expires);

-- ============================================================
-- 创建全文搜索触发器
-- ============================================================

CREATE TRIGGER note_contents_search_vector_trigger BEFORE INSERT OR UPDATE ON public.note_contents
    FOR EACH ROW EXECUTE FUNCTION public.update_note_content_search_vector();

CREATE TRIGGER notes_search_vector_trigger BEFORE INSERT OR UPDATE ON public.notes
    FOR EACH ROW EXECUTE FUNCTION public.update_note_search_vector();

CREATE TRIGGER tags_search_vector_trigger BEFORE INSERT OR UPDATE ON public.tags
    FOR EACH ROW EXECUTE FUNCTION public.update_tag_search_vector();

CREATE TRIGGER folders_search_vector_trigger BEFORE INSERT OR UPDATE ON public.folders
    FOR EACH ROW EXECUTE FUNCTION public.update_folder_search_vector();

-- ============================================================
-- 创建外键约束
-- ============================================================

-- 用户认证表外键
ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 工作空间外键
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 文件夹外键
ALTER TABLE ONLY public.folders
    ADD CONSTRAINT "folders_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public.folders(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.folders
    ADD CONSTRAINT "folders_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 笔记外键
ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "notes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES public.folders(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT "notes_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 笔记内容外键
ALTER TABLE ONLY public.note_contents
    ADD CONSTRAINT "note_contents_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES public.notes(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 标签外键
ALTER TABLE ONLY public.tags
    ADD CONSTRAINT "tags_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 笔记标签关联外键
ALTER TABLE ONLY public.notes_on_tags
    ADD CONSTRAINT "notes_on_tags_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES public.notes(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.notes_on_tags
    ADD CONSTRAINT "notes_on_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public.tags(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 笔记版本外键
ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT "note_versions_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES public.notes(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.note_versions
    ADD CONSTRAINT "note_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 附件外键
ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT "attachments_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES public.notes(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT "attachments_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- 最近搜索外键
ALTER TABLE ONLY public.recent_searches
    ADD CONSTRAINT "recent_searches_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- AI对话外键
ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE ONLY public.ai_conversations
    ADD CONSTRAINT "ai_conversations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- AI消息外键
ALTER TABLE ONLY public.ai_messages
    ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES public.ai_conversations(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- AI模板外键
ALTER TABLE ONLY public.ai_templates
    ADD CONSTRAINT "ai_templates_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;

ALTER TABLE ONLY public.ai_templates
    ADD CONSTRAINT "ai_templates_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES public.workspaces(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- 用户设置外键
ALTER TABLE ONLY public.user_settings
    ADD CONSTRAINT "user_settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- ============================================================
-- 创建视图 - 常用查询视图
-- ============================================================

-- 用户笔记统计视图
CREATE OR REPLACE VIEW public.user_note_stats AS
SELECT 
    u.id AS "userId",
    u.name AS userName,
    COUNT(DISTINCT n.id) AS totalNotes,
    COUNT(DISTINCT CASE WHEN n."isFavorite" = true THEN n.id END) AS favoriteNotes,
    COUNT(DISTINCT CASE WHEN n."isDeleted" = true THEN n.id END) AS deletedNotes,
    COUNT(DISTINCT n."folderId") AS foldersUsed,
    COUNT(DISTINCT t.id) AS tagsUsed
FROM public.users u
LEFT JOIN public.notes n ON u.id = n."authorId"
LEFT JOIN public.notes_on_tags nt ON n.id = nt."noteId"
LEFT JOIN public.tags t ON nt."tagId" = t.id
WHERE n."isDeleted" = false OR n.id IS NULL
GROUP BY u.id, u.name;

-- 工作空间统计视图
CREATE OR REPLACE VIEW public.workspace_stats AS
SELECT 
    w.id AS "workspaceId",
    w.name AS workspaceName,
    w."ownerId",
    u.name AS ownerName,
    COUNT(DISTINCT wm.id) AS memberCount,
    COUNT(DISTINCT n.id) AS noteCount,
    COUNT(DISTINCT f.id) AS folderCount,
    w."createdAt"
FROM public.workspaces w
LEFT JOIN public.workspace_members wm ON w.id = wm."workspaceId"
LEFT JOIN public.users u ON w."ownerId" = u.id
LEFT JOIN public.notes n ON w.id = n."workspaceId"
LEFT JOIN public.folders f ON w.id = f."workspaceId"
GROUP BY w.id, w.name, w."ownerId", u.name, w."createdAt";

-- 最近编辑笔记视图
CREATE OR REPLACE VIEW public.recent_notes AS
SELECT 
    n.id,
    n.title,
    n.type,
    n."authorId",
    u.name AS authorName,
    n."folderId",
    f.name AS folderName,
    n."isFavorite",
    n."createdAt",
    n."updatedAt",
    ROW_NUMBER() OVER (PARTITION BY n."authorId" ORDER BY n."updatedAt" DESC) AS rank
FROM public.notes n
INNER JOIN public.users u ON n."authorId" = u.id
LEFT JOIN public.folders f ON n."folderId" = f.id
WHERE n."isDeleted" = false;

-- 回收站视图
CREATE OR REPLACE VIEW public.trash_notes AS
SELECT 
    n.id,
    n.title,
    n.type,
    n."authorId",
    u.name AS authorName,
    n."deletedAt",
    n."createdAt"
FROM public.notes n
INNER JOIN public.users u ON n."authorId" = u.id
WHERE n."isDeleted" = true
ORDER BY n."deletedAt" DESC;

-- ============================================================
-- 插入初始数据 - 示例用户和设置
-- ============================================================

-- 注意：生产环境中应该移除这些示例数据
-- INSERT INTO public.users (id, name, email, password, "createdAt", "updatedAt")
-- VALUES 
--     ('user_001', 'Admin User', 'admin@ai-ignite.com', '$2b$10$example_hash', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- ============================================================
-- 数据库注释
-- ============================================================

COMMENT ON TABLE public.users IS '用户表 - 存储用户基本信息';
COMMENT ON TABLE public.accounts IS 'OAuth账户关联表';
COMMENT ON TABLE public.sessions IS '用户会话表';
COMMENT ON TABLE public.workspaces IS '工作空间表 - 支持团队协作';
COMMENT ON TABLE public.workspace_members IS '工作空间成员表';
COMMENT ON TABLE public.folders IS '文件夹表 - 支持层级结构';
COMMENT ON TABLE public.tags IS '标签表';
COMMENT ON TABLE public.notes IS '笔记表 - 存储笔记元数据';
COMMENT ON TABLE public.note_contents IS '笔记内容表 - 存储笔记实际内容';
COMMENT ON TABLE public.notes_on_tags IS '笔记-标签关联表';
COMMENT ON TABLE public.note_versions IS '笔记版本历史表';
COMMENT ON TABLE public.attachments IS '附件表 - 存储文件附件信息';
COMMENT ON TABLE public.recent_searches IS '最近搜索记录表';
COMMENT ON TABLE public.ai_conversations IS 'AI对话表';
COMMENT ON TABLE public.ai_messages IS 'AI消息表';
COMMENT ON TABLE public.ai_templates IS 'AI模板表';
COMMENT ON TABLE public.user_settings IS '用户设置表';

COMMENT ON COLUMN public.notes."isFavorite" IS '是否收藏';
COMMENT ON COLUMN public.notes."viewCount" IS '查看次数';
COMMENT ON COLUMN public.notes.type IS '笔记类型: MARKDOWN, RICHTEXT, MINDMAP, FLOWCHART';
COMMENT ON COLUMN public.ai_conversations.model IS '使用的AI模型';
COMMENT ON COLUMN public.ai_messages.tokens IS '消耗的token数量';
COMMENT ON COLUMN public.user_settings."assistantPanelOpen" IS 'AI助手面板是否默认打开';
COMMENT ON COLUMN public.user_settings."autoSaveInterval" IS '自动保存间隔(秒)';

-- ============================================================
-- 数据库创建完成
-- ============================================================
