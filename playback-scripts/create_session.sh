#!/bin/bash

# delete existing session if it has the same name
session_name="NyquistIDE"
programming_env="Nyquist"
window_1="Editor"
window_2="Output"

# Kill all exisiting processes associated with necessary scripts
pkill -9 -f "control_editor.sh"
pkill -9 -f "nyquist_output.sh"
pkill -9 -f "process_nyquist_input.sh"

# Create a named pipe if it doesn't exist
PIPE_FILE=/tmp/control_editor_pipe
if [[ ! -p "$PIPE_FILE" ]]; 
then
    echo "Creating pipe ..."
    mkfifo "$PIPE_FILE"
fi

# Define cleanup procedure
cleanup() {
    # echo "Script interrupted. Cleaning up..."
    rm -f "$PIPE_FILE" # Remove the named pipe
    tmux kill-session -a -t $session_name
    exit
}

# Set trap to call cleanup function when SIGINT (Ctrl+C), SIGTERM or EXIT signal is received
trap 'cleanup' EXIT INT TERM HUP ERR

if tmux has-session -t "$session_name" 2>/dev/null; then
  tmux kill-session -t "$session_name"
fi

lines="$(tput lines)"
columns="$(tput cols)"

echo "Creating Editor..."
tmux new -d -x "$lines" -y "$columns" -s "$session_name" -n "$programming_env" 'bash'

# Create a second window
echo "Creating Output Terminal..."
tmux split-window -h -t "$session_name:$programming_env" 'bash'

tmux set-option -g mouse on
tmux set -g @plugin 'nhdaly/tmux-better-mouse-mode'
tmux set -g @scroll-down-exit-copy-mode "on"
tmux set -g @scroll-without-changing-pane "on"
tmux set -g @scroll-in-moused-over-pane "on"
bash ~/.tmux/plugins/tpm/tpm

echo "Renaming Panes..."
tmux select-pane -t "$session_name:$programming_env.0" -T "$window_1"
tmux select-pane -t "$session_name:$programming_env.1" -T "$window_2"

tmux send-keys -t "$session_name:$programming_env.0" './control_editor.sh' Enter &
pid1=$!

tmux send-keys -t "$session_name:$programming_env.1" './nyquist_output.sh' Enter &
pid2=$!

tmux attach-session -t "$session_name"

wait $pid1 $pid2

rm -f "$PIPE_FILE" # Remove the named pipe

trap - INT TERM EXIT HUP ERR

tmux kill-session -a -t $session_name 2>/dev/null
