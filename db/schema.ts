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
