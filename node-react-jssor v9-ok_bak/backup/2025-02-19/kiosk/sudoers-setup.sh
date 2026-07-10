#!/bin/bash
#
# Sudoers Setup Script untuk iPray System Time Feature
# Run: sudo bash sudoers-setup.sh
#

echo "=== iPray System Time - Sudoers Configuration ==="
echo ""

# Get current user
CURRENT_USER="${SUDO_USER:-$USER}"
echo "Setting up sudoers for user: $CURRENT_USER"
echo ""

# Backup existing sudoers
echo "Creating backup of current sudoers..."
cp /etc/sudoers /etc/sudoers.backup.$(date +%Y%m%d-%H%M%S)

# Create sudoers.d file for iPray
SUDOERS_FILE="/etc/sudoers.d/ipray-system-time"

echo "Creating sudoers configuration at: $SUDOERS_FILE"

# Write sudoers configuration
cat > "$SUDOERS_FILE" << EOF
# iPray System Time Configuration
# Allow Node.js service to set system time without password
# Created: $(date)

# User: $CURRENT_USER
$CURRENT_USER ALL=(root) NOPASSWD: /usr/bin/timedatectl set-time *
$CURRENT_USER ALL=(root) NOPASSWD: /usr/bin/timedatectl set-ntp *
$CURRENT_USER ALL=(root) NOPASSWD: /bin/date *
EOF

# Set proper permissions (must be 0440)
chmod 0440 "$SUDOERS_FILE"

# Verify syntax
echo ""
echo "Verifying sudoers syntax..."
if visudo -c -f "$SUDOERS_FILE"; then
    echo "✓ Sudoers configuration is valid"
    echo ""
    echo "=== Setup Complete ==="
    echo ""
    echo "Test dengan command berikut (sepatutnya tiada password prompt):"
    echo "  sudo timedatectl"
    echo ""
    echo "Untuk test set time:"
    echo "  sudo timedatectl set-time '2026-02-03 15:30:00'"
    echo ""
    echo "Untuk restore NTP sync:"
    echo "  sudo timedatectl set-ntp true"
    echo ""
else
    echo "✗ Error: Sudoers configuration has syntax errors"
    echo "Removing invalid configuration..."
    rm -f "$SUDOERS_FILE"
    exit 1
fi
