#!/bin/bash

clear

PIPE_FILE=/tmp/control_editor_pipe

echo "Starting nyquist_output.sh..."
dir_path="$(realpath "$(dirname "$0")")"

# Define cleanup procedure
cleanup() {
    echo "Cleaning up nyquist_output.sh..."
    tmux kill-session
    exit
}

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM HUP

# Read input from the named pipe
if [[ -p "$PIPE_FILE" ]]; then

    # Execute the command with process_nyquist_input.sh
    bash "$dir_path/process_nyquist_input.sh" -c "play"
    # # Continuously display the contents of the log file
    # while [[ -p "$PIPE_FILE" ]]; do

    #     echo -n "SAL> "

    #     if read -t 1 -r input < "$PIPE_FILE"; then
    #         # Print the input
    #         echo "$input"
            
    #         if [[ "$input" == "exit" ]]; then
    #             break
    #         fi

    #         # Execute the command with process_nyquist_input.sh
    #         bash "$dir_path/process_nyquist_input.sh" -c "$input"
    #     fi
    # done
else
    echo "Named pipe does not exist."
fi

trap - EXIT INT TERM HUP

echo "Exiting nyquist_output.sh..."

exit
