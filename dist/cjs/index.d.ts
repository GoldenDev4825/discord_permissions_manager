import { RESTPutAPIApplicationCommandPermissionsJSONBody, APIRole, APIChannel, APIApplicationCommandPermission, Snowflake, ApplicationCommandPermissionType, APIApplicationCommand } from 'discord-api-types/v10';
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
export declare class DiscordPermissionsManager {
    private applicationId;
    private botToken;
    private guildId;
    private bearerToken;
    private baseUrl;
    constructor(options: DiscordPermissionsManagerOptions);
    private fetch;
    private botFetch;
    private fetchCurrentUser;
    private fetchGuild;
    private fetchGuildRoles;
    private fetchGuildChannels;
    private fetchCommands;
    private fetchCommandPermissions;
    private fetchMember;
    private calculatePermissions;
    private canUserRunCommand;
    private calculateChannelPermissions;
    private hasChannelManageAccess;
    private getManageableRoles;
    validateCommandPermissionAccess(commandId: Snowflake): Promise<boolean>;
    getCommandPermissions(commandId: Snowflake): Promise<APIApplicationCommandPermission[]>;
    addCommandPermissions(commandId: Snowflake, newPermissions: APIApplicationCommandPermission[]): Promise<APIApplicationCommandPermission[]>;
    removeCommandPermission(commandId: Snowflake, targetId: Snowflake, targetType: ApplicationCommandPermissionType): Promise<APIApplicationCommandPermission[]>;
    setCommandPermissions(commandId: Snowflake, permissions: APIApplicationCommandPermission[]): Promise<void>;
    getAvailableManageableResources(): Promise<ManageableResources>;
}
