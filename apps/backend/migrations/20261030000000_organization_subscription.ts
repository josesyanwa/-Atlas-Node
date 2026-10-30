import { Kysely, sql } from 'kysely';

const FREE_PLAN_QUOTA_BYTES = 5 * 1024 ** 3;

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .alterTable('organizations')
    .addColumn('active_subscription_plan', 'text', (column) =>
      column.notNull().defaultTo('free'),
    )
    .addColumn('usage_quota_bytes', 'bigint', (column) =>
      column.notNull().defaultTo(FREE_PLAN_QUOTA_BYTES),
    )
    .execute();

  await sql`
    alter table organizations
      add constraint organizations_active_subscription_plan_check
        check (active_subscription_plan in ('free', 'pro', 'enterprise')),
      add constraint organizations_usage_quota_bytes_positive
        check (usage_quota_bytes > 0)
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`
    alter table organizations
      drop constraint organizations_active_subscription_plan_check,
      drop constraint organizations_usage_quota_bytes_positive,
      drop column active_subscription_plan,
      drop column usage_quota_bytes
  `.execute(db);
}
