import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable('clients')
    .addColumn('id', 'uuid', (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('organization_id', 'uuid', (column) =>
      column.notNull().references('organizations.id').onDelete('cascade'),
    )
    .addColumn('name', 'text', (column) => column.notNull())
    .addColumn('email', 'text', (column) => column.notNull())
    .addColumn('company_name', 'text')
    .addColumn('created_by_user_id', 'text', (column) =>
      column.notNull().references('auth.user.id').onDelete('restrict'),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable('client_users')
    .addColumn('client_id', 'uuid', (column) =>
      column.notNull().references('clients.id').onDelete('cascade'),
    )
    .addColumn('user_id', 'text', (column) =>
      column.notNull().references('auth.user.id').onDelete('cascade'),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addPrimaryKeyConstraint('client_users_pkey', ['client_id', 'user_id'])
    .execute();

  await db.schema
    .createTable('client_portal_invites')
    .addColumn('id', 'uuid', (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('client_id', 'uuid', (column) =>
      column.notNull().references('clients.id').onDelete('cascade'),
    )
    .addColumn('token_hash', 'text', (column) => column.notNull())
    .addColumn('status', 'text', (column) =>
      column.notNull().defaultTo('pending'),
    )
    .addColumn('expires_at', 'timestamptz', (column) => column.notNull())
    .addColumn('accepted_by_user_id', 'text', (column) =>
      column.references('auth.user.id').onDelete('set null'),
    )
    .addColumn('accepted_at', 'timestamptz')
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable('document_requests')
    .addColumn('id', 'uuid', (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('organization_id', 'uuid', (column) =>
      column.notNull().references('organizations.id').onDelete('cascade'),
    )
    .addColumn('client_id', 'uuid', (column) =>
      column.notNull().references('clients.id').onDelete('cascade'),
    )
    .addColumn('title', 'text', (column) => column.notNull())
    .addColumn('description', 'text')
    .addColumn('due_date', 'date')
    .addColumn('status', 'text', (column) =>
      column.notNull().defaultTo('requested'),
    )
    .addColumn('requested_by_user_id', 'text', (column) =>
      column.notNull().references('auth.user.id').onDelete('restrict'),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await db.schema
    .createTable('client_documents')
    .addColumn('id', 'uuid', (column) =>
      column.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('request_id', 'uuid', (column) =>
      column.notNull().references('document_requests.id').onDelete('cascade'),
    )
    .addColumn('object_key', 'text', (column) => column.notNull())
    .addColumn('original_filename', 'text', (column) => column.notNull())
    .addColumn('content_type', 'text', (column) => column.notNull())
    .addColumn('size_bytes', 'bigint', (column) => column.notNull())
    .addColumn('uploaded_by_user_id', 'text', (column) =>
      column.notNull().references('auth.user.id').onDelete('restrict'),
    )
    .addColumn('created_at', 'timestamptz', (column) =>
      column.notNull().defaultTo(sql`now()`),
    )
    .execute();

  await sql`
    alter table client_portal_invites
      add constraint client_portal_invites_status_check
        check (status in ('pending', 'accepted', 'revoked', 'expired'))
  `.execute(db);
  await sql`
    alter table document_requests
      add constraint document_requests_status_check
        check (status in ('requested', 'received'))
  `.execute(db);
  await sql`
    alter table client_documents
      add constraint client_documents_size_positive
        check (size_bytes > 0)
  `.execute(db);

  await db.schema
    .createIndex('clients_organization_email_unique')
    .unique()
    .on('clients')
    .columns(['organization_id', 'email'])
    .execute();

  await db.schema
    .createIndex('client_portal_invites_token_hash_unique')
    .unique()
    .on('client_portal_invites')
    .column('token_hash')
    .execute();

  await db.schema
    .createIndex('client_portal_invites_pending_client_unique')
    .unique()
    .on('client_portal_invites')
    .column('client_id')
    .where(sql<boolean>`status = 'pending'`)
    .execute();

  await db.schema
    .createIndex('document_requests_organization_client_created_idx')
    .on('document_requests')
    .columns(['organization_id', 'client_id', 'created_at'])
    .execute();

  await db.schema
    .createIndex('client_documents_request_created_idx')
    .on('client_documents')
    .columns(['request_id', 'created_at'])
    .execute();
}

export async function down(db: Kysely<any>): Promise<void> {
  for (const table of [
    'client_documents',
    'document_requests',
    'client_portal_invites',
    'client_users',
    'clients',
  ]) {
    await db.schema.dropTable(table).ifExists().cascade().execute();
  }
}
