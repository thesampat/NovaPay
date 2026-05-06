#!/bin/sh

TOPICS="
admin_get_ledgers
admin_get_ledgers.reply
admin_get_stats
admin_get_stats.reply
admin_get_users
admin_get_users.reply
admin_reset_ledger
admin_reset_ledger.reply
admin_reset_users
admin_reset_users.reply
admin_run_refunds
admin_run_refunds.reply
admin_seed_users
admin_seed_users.reply
check_transaction
clear_rate
clear_rate.reply
create_user
create_user.reply
get_balance
get_balance.reply
get_currency
get_currency.reply
get_rate
get_rate.reply
get_status
get_status.reply
get_user
run_payroll
run_payroll.reply
transaction_completed
transfer_amount
transfer_amount.reply
update_balance
update_balance.reply
update_ledger_status
update_ledger_status.reply
write_ledger
write_ledger.reply
"

for topic in $TOPICS
do
  echo "Creating topic: $topic"

  /opt/kafka/bin/kafka-topics.sh \
    --bootstrap-server kafka:29092 \
    --create \
    --if-not-exists \
    --topic "$topic" \
    --partitions 3 \
    --replication-factor 1
done

echo "All topics created"