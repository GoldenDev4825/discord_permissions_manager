import fetch from 'node-fetch';
import {
  RESTGetAPICurrentUserResult,
  RESTGetAPIGuildResult,
  RESTPutAPIApplicationCommandPermissionsJSONBody,
  APIRole,
  APIChannel,
  APIGuildApplicationCommandPermissions,
  PermissionFlagsBits,
  APIApplicationCommandPermission,
  Snowflake,
  ApplicationCommandPermissionType,
  APIApplicationCommand,
} from 'discord-api-types/v10';

export interface DiscordPermissionsManagerOptions {
  applicationId: Snowflake;
  botToken: string;
  bearerToken: string;
  guildId: Snowflake;
  commandId?: Snowflake;
}

export interface UpdatePermissionsOptions extends DiscordPermissionsManagerOptions {
  permissions: RESTPutAPIApplicationCommandPermissionsJSONBody;
}

export interface ManageableResources {
  roles: APIRole[];
  channels: APIChannel[];
  commands: APIApplicationCommand[];
}

export class DiscordPermissionsManager {
  private applicationId: Snowflake;
  private botToken: string;
  private guildId: Snowflake;
  private bearerToken: string;
  private baseUrl = 'https://discord.com/api/v10';

  constructor(options: DiscordPermissionsManagerOptions) {
    this.applicationId = options.applicationId;
    this.guildId = options.guildId;
    this.bearerToken = options.bearerToken;
    this.botToken = options.botToken;
  }

  private async fetch<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
    const data = await res.json();
    return data as T;
  }
  private async botFetch<T>(url: string): Promise<T> {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${this.botToken}`,
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`Failed to fetch ${url} (${res.status})`);
    const data = await res.json();
    return data as T;
  }

  private async fetchCurrentUser(): Promise<RESTGetAPICurrentUserResult> {
    return this.fetch(`${this.baseUrl}/users/@me`);
  }

  private async fetchGuild(): Promise<RESTGetAPIGuildResult> {
    return this.botFetch(`${this.baseUrl}/guilds/${this.guildId}`);
  }

  private async fetchGuildRoles(): Promise<APIRole[]> {
    return this.botFetch(`${this.baseUrl}/guilds/${this.guildId}/roles`);
  }

  private async fetchGuildChannels(): Promise<APIChannel[]> {
    return this.botFetch(`${this.baseUrl}/guilds/${this.guildId}/channels`);
  }

  private async fetchCommands(): Promise<APIApplicationCommand[]> {
    return this.botFetch(`${this.baseUrl}/applications/${this.applicationId}/guilds/${this.guildId}/commands`);
  }

  private async fetchCommandPermissions(commandId: Snowflake): Promise<APIGuildApplicationCommandPermissions> {
    return this.fetch(`${this.baseUrl}/applications/${this.applicationId}/guilds/${this.guildId}/commands/${commandId}/permissions`);
  }

  private async fetchMember(userId: Snowflake) {
    return this.botFetch(`${this.baseUrl}/guilds/${this.guildId}/members/${userId}`);
  }

  private async calculatePermissions(member: any, roles: APIRole[]): Promise<bigint> {
    const memberRoles = roles.filter(r => member.roles.includes(r.id));
    let perms = BigInt(0);
    for (const role of memberRoles) {
      perms |= BigInt(role.permissions);
    }
    return perms;
  }

  private canUserRunCommand(userId: Snowflake, command: APIApplicationCommand & { default_member_permissions?: string | null }, userPermissions: bigint, guildOwnerId: string): boolean {
    if (userId === guildOwnerId) return true;
    if ((userPermissions & PermissionFlagsBits.Administrator) !== 0n) return true;
  
    // Check required default member permissions
    const defaultPerms = command.default_member_permissions;
    if (defaultPerms && defaultPerms !== '0') {
      const required = BigInt(defaultPerms);
      if ((userPermissions & required) !== required) {
        return false;
      }
    } else if (!defaultPerms){
      return false;
    }
  
    return true;
  }

  private calculateChannelPermissions(member: any, channel: APIChannel, roles: APIRole[], guildOwnerId: Snowflake): bigint {
    if (member.user?.id === guildOwnerId) {
      return BigInt(PermissionFlagsBits.Administrator);
    }
  
    const memberRoles = roles.filter(r => member.roles.includes(r.id));
    let permissions = BigInt(0);
    for (const role of memberRoles) {
      permissions |= BigInt(role.permissions);
    }
  
    if ((permissions & PermissionFlagsBits.Administrator) !== 0n) {
      return BigInt(PermissionFlagsBits.Administrator);
    }
  
    if (!('permission_overwrites' in channel)) return permissions;
  
    const overwrites = channel.permission_overwrites;
  
    let everyoneOverwrite: any = null;
    const roleOverwrites: any[] = [];
    let memberOverwrite: any = null;
  
    for (const overwrite of overwrites) {
      if (overwrite.id === channel.guild_id) {
        everyoneOverwrite = overwrite;
      } else if (member.roles.includes(overwrite.id)) {
        roleOverwrites.push(overwrite);
      } else if (overwrite.id === member.user.id) {
        memberOverwrite = overwrite;
      }
    }
  
    if (everyoneOverwrite) {
      permissions &= ~BigInt(everyoneOverwrite.deny);
      permissions |= BigInt(everyoneOverwrite.allow);
    }
  
    let roleAllow = BigInt(0);
    let roleDeny = BigInt(0);
    for (const overwrite of roleOverwrites) {
      roleAllow |= BigInt(overwrite.allow);
      roleDeny |= BigInt(overwrite.deny);
    }
    permissions &= ~roleDeny;
    permissions |= roleAllow;
  
    if (memberOverwrite) {
      permissions &= ~BigInt(memberOverwrite.deny);
      permissions |= BigInt(memberOverwrite.allow);
    }
  
    return permissions;
  }

  private hasChannelManageAccess(permissions: bigint): boolean {
    return (permissions & PermissionFlagsBits.ManageChannels) !== 0n ||
      (permissions & PermissionFlagsBits.Administrator) !== 0n;
  }

  private getManageableRoles(member: any, roles: APIRole[], guildOwnerId: Snowflake): APIRole[] {
    if (member.user?.id === guildOwnerId) return roles;
  
    const memberRoles = roles.filter(r => member.roles.includes(r.id));
  
    const highestEligibleRole = memberRoles
      .filter(role => {
        const perms = BigInt(role.permissions);
        return (perms & PermissionFlagsBits.ManageRoles) !== 0n ||
              (perms & PermissionFlagsBits.Administrator) !== 0n;
      })
      .sort((a, b) => b.position - a.position)[0];
  
    if (!highestEligibleRole) return [];
  
    return roles.filter(role => role.position < highestEligibleRole.position);
  }

  public async validateCommandPermissionAccess(commandId: Snowflake): Promise<boolean> {
    const user = await this.fetchCurrentUser();
    const member = await this.fetchMember(user.id);
    const roles = await this.fetchGuildRoles();
    const commands = await this.fetchCommands();
  
    const command = commands.find(c => c.id === commandId);
    if (!command) throw new Error('Command not found');
  
    const permissions = await this.calculatePermissions(member, roles); // returns bigint
  
    const guild = await this.fetchGuild();
  
    if (user.id === guild.owner_id) return;
    if ((permissions & PermissionFlagsBits.Administrator) !== 0n) return;
  
    const hasManageGuild = (permissions & PermissionFlagsBits.ManageGuild) !== 0n;
    const hasManageRoles = (permissions & PermissionFlagsBits.ManageRoles) !== 0n;
  
    if (!hasManageGuild || !hasManageRoles) {
      throw new Error('Missing Manage Guild or Manage Roles permissions');
    }
  
    if (!this.canUserRunCommand(user.id, command, permissions, guild.owner_id)) {
      throw new Error('User does not have access to run this command');
    }

    return true;
  }

  public async getCommandPermissions(commandId: Snowflake): Promise<APIApplicationCommandPermission[]> {
    let data = await this.fetchCommandPermissions(commandId).catch(err => {});
    return data ? data.permissions : [];
  }

  public async addCommandPermissions(commandId: Snowflake, newPermissions: APIApplicationCommandPermission[]): Promise<APIApplicationCommandPermission[]> {
    await this.validateCommandPermissionAccess(commandId);
  
    const current = await this.getCommandPermissions(commandId);

    const filtered = current.filter(
      existing => !newPermissions.some(
        incoming => incoming.id === existing.id && incoming.type === existing.type
      )
    );
  
    const updated = [...filtered, ...newPermissions];
  
    await this.setCommandPermissions(commandId, updated);
    return updated;
  }  

  public async removeCommandPermission(commandId: Snowflake, targetId: Snowflake, targetType: ApplicationCommandPermissionType): Promise<APIApplicationCommandPermission[]> {
    await this.validateCommandPermissionAccess(commandId);
  
    const current = await this.getCommandPermissions(commandId);
  
    const updated = current.filter(p => !(p.id === targetId && p.type === targetType));
  
    await this.setCommandPermissions(commandId, updated);
    return updated;
  }

  public async setCommandPermissions(commandId: Snowflake, permissions: APIApplicationCommandPermission[]): Promise<void> {
    await this.validateCommandPermissionAccess(commandId!);
  
    const url = `${this.baseUrl}/applications/${this.applicationId}/guilds/${this.guildId}/commands/${commandId}/permissions`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${this.bearerToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ permissions })
    });
  
    if (!res.ok) {
      const error = await res.json();
      throw new Error(`Failed to update command permissions: ${JSON.stringify(error)}`);
    }
  }

  public async getAvailableManageableResources(): Promise<ManageableResources> {
    const user = await this.fetchCurrentUser();
    const member = await this.fetchMember(user.id);
    const roles = await this.fetchGuildRoles();
    const channels = await this.fetchGuildChannels();
    const commands = await this.fetchCommands();
  
    const permissions = await this.calculatePermissions(member, roles);
    const hasAdministrator = (permissions & PermissionFlagsBits.Administrator) !== 0n;
    const hasManageChannels = hasAdministrator || ((permissions & PermissionFlagsBits.ManageChannels) !== 0n);
  
    const guild = await this.fetchGuild();
    const manageableRoles = this.getManageableRoles(member, roles, guild.owner_id);

    const manageableChannels = hasManageChannels ? channels : channels.filter(channel => {
      const channelPerms = this.calculateChannelPermissions(member, channel, roles, guild.owner_id);
      return this.hasChannelManageAccess(channelPerms);
    });
  
    const permissionChecks = await Promise.all(
      commands.map(async (command) => {
        const permissions = await this.calculatePermissions(member, roles);
        const canRun = this.canUserRunCommand(user.id, command, permissions, guild.owner_id);
        return {
          command,
          canRun
        };
      })
    );
    
    const manageableCommands = permissionChecks
      .filter(result => result.canRun)
      .map(result => result.command);

    return {
      roles: manageableRoles,
      channels: manageableChannels,
      commands: manageableCommands,
    };
  }
}