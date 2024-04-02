#!/bin/bash

clear

PIPE_FILE=/tmp/control_editor_pipe

# Define cleanup procedure
cleanup() {
    echo "exit" > "$PIPE_FILE"
    pkill -9 -f "nyquist_output.sh"
    tmux kill-session
    exit
}

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM ERR

while pgrep -f "nyquist_output.sh" >/dev/null 2>&1; do
    # If the pipe file exists, write to it, otherwise do nothing
    read -p "> " -r input

    if [[ -p "$PIPE_FILE" ]]; then
        echo "$input" > "$PIPE_FILE"
    else
        echo "Named pipe does not exist."
        break
    fi
    clear
    if [[ "$input" == "exit" ]]; then
        rm -f /tmp/control-editor-pipe
        break
    fi

done


trap - EXIT INT TERM ERR

tmux kill-session

exit
