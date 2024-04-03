#!/bin/bash

# This script is used to start the nyquist_output.sh process.
# It echoes a message indicating that the script is starting.
echo "Starting nyquist_output.sh..."
clear

dir_path="$(realpath "$(dirname "$0")")"

# Path to the file where the XLISPPATH will be saved
PATH_FILE="$dir_path/.xlisppath"
XLISPPATH_SET=false

PIPE_FILE=/tmp/control_editor_pipe

# Define cleanup procedure
# This function is responsible for cleaning up the nyquist_output.sh script.
# It kills the tmux session and exits the script.
cleanup() {
    echo "Cleaning up nyquist_output.sh..."
    tmux kill-session
    exit
}

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM HUP

echo "Waiting for XLISPPATH to be set..."

# This script is responsible for setting the XLISPPATH environment variable by reading the path from a file.
# It continuously checks if the editor is open and running, and if not, it performs cleanup and exits.
# It also checks if the PATH_FILE exists, and if so, it reads the path from the file and sets the XLISPPATH variable.
# The script runs in a loop until the XLISPPATH is successfully set.
while [[ $XLISPPATH_SET == false ]]; do
    # Check is editor is open and running
    if ! pgrep -f "control_editor.sh" >/dev/null 2>&1; then
        echo "Editor closed..."
        cleanup
        sleep 2
        exit
    fi
    # Check if the PATH_FILE exists
    if [[ -f "$PATH_FILE" ]]; then
        # Read the path from the file
        path=$(cat "$PATH_FILE")
        export XLISPPATH="$path"
        XLISPPATH_SET=true
    fi
done

echo "XLISPPATH is set to: "$XLISPPATH""

# Check if the named pipe exists
if [[ ! -p "$PIPE_FILE" ]]; then
    echo "Creating pipe ..."
    mkfifo "$PIPE_FILE"
fi

# Start the process_command_file.exp
expect "$dir_path/process_command_file.exp" "$input"

trap - EXIT INT TERM HUP

echo "Exiting nyquist_output.sh..."

exit
