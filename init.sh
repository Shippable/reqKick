#!/bin/bash -e

readonly JOB_WHO_PATH="$STATUS_DIR"/job.who
readonly JOB_STATUS_PATH="$STATUS_DIR"/job.status
readonly JOB_ENV_PATH="$STATUS_DIR"/job.env

#
# Kick flow
#
set_status() {
  echo "Setting status to success"
  echo "4002" > "$JOB_STATUS_PATH"
}

back_to_reqproc() {
  echo "Handing control back to reqProc"
  echo "reqProc" > "$JOB_WHO_PATH"
}

kick() {
  echo "Kick starting the build"
  set_status
  back_to_reqproc
}

poll() {
  while :
  do
    if [ -z "$STATUS_DIR" ]; then
      echo "Missing STATUS_DIR. Skipping."
    else
      local who=$(cat $JOB_WHO_PATH)
      if [ "$who" = "reqKick" ]; then
        kick
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
