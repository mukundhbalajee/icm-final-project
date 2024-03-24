#!/bin/bash

clear

PIPE_FILE=/tmp/control_editor_pipe

# Define cleanup procedure
cleanup() {
    tmux kill-session
    exit
}

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM HUP ERR

# Read input from the named pipe
if [[ -p "$PIPE_FILE" ]]; then
    # Continuously display the contents of the log file
    while [[ -p "$PIPE_FILE" ]]; do

        echo -n "SAL> "

        if read -t 1 -r input < "$PIPE_FILE"; then
            # Print the input
            echo "$input"
            
            if [[ "$input" == "exit" ]]; then
                break
            fi

            # Execute the command with process_nyquist_input.sh
            ./process_nyquist_input.sh -c "$input"
        fi
    
    done
else
    echo "Named pipe does not exist."
fi


trap - INT TERM EXIT HUP ERR

exit
