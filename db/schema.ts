import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const applications = sqliteTable('applications', {
 id:text('id').primaryKey(), owner:text('owner').notNull(), data:text('data').notNull(),
 step:integer('step').notNull().default(0), status:text('status').notNull().default('draft'),
 createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(),
 submittedAt:text('submitted_at'), receipt:text('receipt'),
},table=>[index('idx_applications_owner_created').on(table.owner,table.createdAt)]);
export const documents=sqliteTable('documents',{
 id:text('id').primaryKey(),applicationId:text('application_id').notNull().references(()=>applications.id),
 requirementId:text('requirement_id').notNull(),name:text('name').notNull(),size:integer('size').notNull(),
 mime:text('mime').notNull(),objectKey:text('object_key').notNull(),uploadedAt:text('uploaded_at').notNull(),
},table=>[index('idx_documents_application').on(table.applicationId)]);
export const users=sqliteTable('users',{
 id:text('id').primaryKey(),email:text('email').notNull().unique(),name:text('name').notNull(),
 passwordHash:text('password_hash').notNull(),passwordSalt:text('password_salt').notNull(),createdAt:text('created_at').notNull(),
});
export const sessions=sqliteTable('sessions',{
 id:text('id').primaryKey(),userId:text('user_id').notNull().references(()=>users.id,{onDelete:'cascade'}),
 tokenHash:text('token_hash').notNull().unique(),expiresAt:text('expires_at').notNull(),createdAt:text('created_at').notNull(),
},table=>[index('idx_sessions_user').on(table.userId),index('idx_sessions_token').on(table.tokenHash)]);
