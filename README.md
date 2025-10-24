# 🚀 Discord Comamnd Permissions Manager

- 🔗 Reference: [Discord Developer Docs](https://discord.com/developers/docs)
- 🔗 Support/Hangout Discord: [Golden Development](https://discord.goldendev.net)
- 🔗 My YouTube Channel: [Golden Development](https://youtube.goldendev.net)
- 🔗 My Discord Bot: [Golden Bot](https://goldenbot.net)

## 📦 Installation

Install the npm package into your bot or utility project. It is framework-agnostic and works with any method that sends raw Discord payloads (e.g., REST, Interactions API, libraries like `discord.js`, `harmony`, etc.). Originally designed to be used with discord.js.

```bash
npm install discord_permissions_manager
```

## ✨ Features
- ✅ Fetch application commands and their permissions
- ✅ Add, update, or remove individual command permissions
- ✅ Validate the invoking user's ability to manage command permissions
- ✅ Automatically resolves role/channel access based on user privileges
- ✅ Calculate permissions with support for channel overrides and admin bypass

## 🛠️ Usage Example

```ts
import { DiscordPermissionsManager } from './DiscordPermissionsManager';

const manager = new DiscordPermissionsManager({
  applicationId: 'YOUR_APP_ID',
  botToken: 'YOUR_BOT_TOKEN',
  bearerToken: 'YOUR_OAUTH_TOKEN', // This is specifically from a user who authenticated with your bot via OAuth2 with the scope applications.commands.permissions.update
  guildId: 'GUILD_ID',
});

// Add permission to a command
await manager.addCommandPermissions('COMMAND_ID', [
  {
    id: 'ROLE_OR_USER_OR_CHANNEL_ID',
    type: 0, // 1 = Role, 2 = User, 3 = Channel
    permission: true // Whether or not specified item has access
  }
]);

// Set exact list of permissions for a command
await manager.setCommandPermissions('COMMAND_ID', [
  {
    id: 'ROLE_OR_USER_OR_CHANNEL_ID',
    type: 0, // 1 = Role, 2 = User, 3 = Channel
    permission: true // Whether or not specified item has access
  }
]);

// Remove specific item from permission overwrites for a command
await manager.removeCommandPermission('COMMAND_ID', [
  {
    id: 'ROLE_OR_USER_OR_CHANNEL_ID',
    type: 0, // 1 = Role, 2 = User, 3 = Channel
  }
]);

// List current permission overwrites of a command
const permissions = await manager.getCommandPermissions('COMMAND_ID');
// Expected output: [ { id: 'ROLE_OR_USER_OR_CHANNEL_ID', type: 0, permission: true } ]

// Check if a command is managable by the authenticated user
const managable = await manager.validateCommandPermissionAccess('COMMAND_ID');
// Expected output: true if successful or error if failed

// Return a list of all roles, channels, and commands that the authenticated user can manage (very important to check since if they can't manage a specific role or channel then they can't set overwrites on any command for said item)
const resources = await manager.getAvailableManageableResources();
// Expected output: { roles, channels, commands }
```

## 📘 API
`new DiscordPermissionsManager(options)`
Creates a new manager instance.

**Options:**
- `applicationId`: Discord Application ID
- `botToken`: Bot token (Bot ...)
- `bearerToken`: OAuth2 token with required scopes (Bearer ...)
- `guildId`: Target guild ID

## 🔍 Core Methods
`getCommandPermissions(commandId)`
Returns current permissions for the given command.

`addCommandPermissions(commandId, permissions[])`
Merges and sets new permissions for the command.

`removeCommandPermission(commandId, targetId, type)`
Removes a specific permission entry (role or user).

`setCommandPermissions(commandId, permissions[])`
Directly sets the permissions list (replaces existing).

`validateCommandPermissionAccess(commandId)`
Throws an error if the current user is not allowed to manage the command.

`getAvailableManageableResources()`
Returns all roles, channels, and commands that the current user can manage.

## 🔐 Permission Logic
- Guild owners always have full access.
- Admin roles bypass all restrictions.
- Role hierarchy and Discord permission flags (e.g., ManageGuild, ManageRoles) are enforced.
- Channel-level permission overwrites are considered when evaluating channel access.

## 🧾 License
Custom MIT, refer to LICENSE file © Golden Development