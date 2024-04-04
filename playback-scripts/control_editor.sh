#!/bin/bash

# Script: control_editor.sh
# Description: This script is used for controlling the playback of a music composition.
# It waits for user input and writes the input to a named pipe file, which is then read by another script (nyquist_output.sh) for processing.
# If the named pipe file exists, the user input is written to it. If the file does not exist, an error message is displayed.
# The script continues to wait for user input until the user enters "exit", at which point the named pipe file is removed and the script exits.

# Usage: 
# 1. Make sure the script has execute permissions. If not, run the following command:
#    chmod +x control_editor.sh
# 2. Run the script using the following command:
#    ./control_editor.sh
# 3. The script will display a prompt "> " and wait for user input.
# 4. Enter the desired input and press Enter. The input will be written to the named pipe file.
# 5. The script will continue to wait for user input until the user enters "exit".
# 6. When "exit" is entered, the named pipe file is removed and the script exits.

clear

# Define cleanup procedure
# This function is responsible for cleaning up the control_editor.sh script.
# It performs the following actions:
# - Writes "exit" to the PIPE_FILE to signal the termination of the script.
# - Kills any running instances of "nyquist_output.sh" using pkill.
# - Terminates the tmux session using tmux kill-session.
# - Exits the script.
cleanup() {
    echo "Cleaning up control_editor.sh..."
    echo "exit" > "$PIPE_FILE"
    pkill -9 -f "nyquist_output.sh"
    tmux kill-session
    exit
}

# This script sets the directory path and executes the "get_XLISP_path.sh" script.
echo "Starting control_editor.sh..."

PIPE_FILE=/tmp/control_editor_pipe
dir_path=$(realpath "$(dirname "$0")")  # Get the absolute path of the directory containing this script
bash "$dir_path/get_XLISP_path.sh"  # Execute the "get_XLISP_path.sh" script

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM HUP 

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

trap - EXIT INT TERM HUP

tmux kill-session

echo "Exiting control_editor.sh..."

exit
