#!/bin/bash
echo "0 3 * * * /opt/studio/scripts/backup.sh >> /var/log/studio-backup.log 2>&1" | crontab -
crontab -l
