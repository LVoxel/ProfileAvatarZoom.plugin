/**
 * @name ProfileAvatarContextMenu
 * @version 1.0.0
 * @description Плагин для просмотра аватара в Discord
 * @author salyamiii
 * @authorId 528185437399810081
 * @website https://github.com/LVoxel/ProfileAvatarZoom.plugin
 * @updateurl https://raw.githubusercontent.com/LVoxel/ProfileAvatarZoom.plugin/refs/heads/main/ProfileAvatarZoom.plugin.js
 * @source https://github.com/LVoxel/ProfileAvatarZoom.plugin
 */

(() => {
    "use strict";

    const { Webpack, ContextMenu } = BdApi;
    const { Filters } = Webpack;
    const UserStore = Webpack.getModule(Filters.byProps("getUser"));

    class ShowAvatarLink {
        start() {
            this.patchUserContextMenu();
        }

        stop() {
            this.unpatchUserContextMenu();
        }

        patchUserContextMenu() {
            ContextMenu.patch("user-context", this.handleUserContextMenu);
        }

        unpatchUserContextMenu() {
            ContextMenu.unpatch("user-context", this.handleUserContextMenu);
        }

        appendAvatarLinkMenuGroup(menu, userId) {
            const user = UserStore.getUser(userId);
            if (user && user.avatar) {
                const isAnimated = user.avatar.startsWith("a_");
                const extension = isAnimated ? "gif" : "png";
                const avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${extension}?size=1024`;
                
                menu.props.children.splice(
                    menu.props.children.length - 1,
                    0,
                    this.buildAvatarLinkMenuGroup(avatarUrl)
                );
            }
        }

        buildAvatarLinkMenuGroup(avatarUrl) {
            return (
                BdApi.React.createElement(ContextMenu.Group, null,
                    BdApi.React.createElement(ContextMenu.Item, {
                        id: "show-avatar-link",
                        label: "Получить ссылку на аватар",
                        action: () => this.showAvatarLink(avatarUrl),
                        disabled: !avatarUrl,
                    })
                )
            );
        }

        showAvatarLink(avatarUrl) {
            BdApi.alert("Avatar URL", `Ссылка на аватар URL: \n\n${avatarUrl}`);
        }

        handleUserContextMenu = (menu, { user }) => {
            this.appendAvatarLinkMenuGroup(menu, user.id);
        };
    }

    module.exports = ShowAvatarLink;
})();
