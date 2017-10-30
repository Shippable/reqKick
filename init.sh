#!/bin/bash -e

readonly JOB_WHO_PATH="$STATUS_DIR"/job.who
readonly JOB_STATUS_PATH="$STATUS_DIR"/job.status
readonly JOB_ENV_PATH="$STATUS_DIR"/job.env

#
# Headers
#
exec_cmd() {
  cmd=$@
  cmd_uuid=$(cat /proc/sys/kernel/random/uuid)
  cmd_start_timestamp=`date +"%s"`
  echo "__SH__CMD__START__|{\"type\":\"cmd\",\"sequenceNumber\":\"$cmd_start_timestamp\",\"id\":\"$cmd_uuid\"}|$cmd"
  eval $cmd
  cmd_status=$?
  cmd_end_timestamp=`date +"%s"`
  echo "__SH__CMD__END__|{\"type\":\"cmd\",\"sequenceNumber\":\"$cmd_start_timestamp\",\"id\":\"$cmd_uuid\",\"completed\":\"$cmd_status\"}|$cmd"
  return $cmd_status
}

exec_grp() {
  group_name=$1
  group_uuid=$(cat /proc/sys/kernel/random/uuid)
  group_start_timestamp=`date +"%s"`
  echo "__SH__GROUP__START__|{\"type\":\"grp\",\"sequenceNumber\":\"$group_start_timestamp\",\"id\":\"$group_uuid\"}|$group_name"
  eval "$group_name"
  group_status=$?
  group_end_timestamp=`date +"%s"`
  echo "__SH__GROUP__END__|{\"type\":\"grp\",\"sequenceNumber\":\"$group_end_timestamp\",\"id\":\"$group_uuid\",\"completed\":\"$group_status\"}|$group_name"
}

#
# Kick flow
#
set_status() {
  echo "4002" > "$JOB_STATUS_PATH"
}

back_to_reqproc() {
  echo "reqProc" > "$JOB_WHO_PATH"
}

kick() {
  exec_cmd "set_status"
  exec_cmd "back_to_reqproc"
}

poll() {
  while :
  do
    if [ -z "$STATUS_DIR" ]; then
      echo "Missing STATUS_DIR. Skipping."
    else
      local who=$(cat $JOB_WHO_PATH)
      if [ "$who" = "reqKick" ]; then
        consoles=$(exec_grp "kick")
      else
        echo "Found $who in $JOB_WHO_PATH, skipping."
      fi
    fi

    sleep 5
  done
}

main() {
  poll
}

main
