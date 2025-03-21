#!/bin/bash

for auth_id in "$@"; do
    scripts/update_tkick.sh db/other_futsal_3vs3.db "$auth_id"
    scripts/update_tkick.sh db/other_futsal_1vs1.db "$auth_id"
    scripts/remove_bot.sh db/main_futsal_players.db "$auth_id"
    scripts/update_trust_level.sh db/main_futsal_players.db "$auth_id" 1
    S='GOD,!'
    S="${S}ban_reload"
    echo "$S" >>./dynamic/god_commander_3vs3_1.txt
    echo "$S" >>./dynamic/god_commander_1vs1_1.txt
done

