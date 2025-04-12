/**
 * @name ProfileAvatarContextMenuV2
 * @version 2.0.4
 * @description Плагин для просмотра аватара и баннера в Discord
 * @author salyamiii
 * @authorId 528185437399810081
 * @website https://github.com/LVoxel/ProfileAvatarZoom.plugin
 * @updateurl https://raw.githubusercontent.com/LVoxel/ProfileAvatarZoom.plugin/refs/heads/main/ProfileAvatarZoom.plugin.js
 * @source https://github.com/LVoxel/ProfileAvatarZoom.plugin
 */

module.exports = class ProfileAvatarContextMenuV2 {
    constructor() {
        this.handleUserContextMenu = this.handleUserContextMenu.bind(this);
        this.PreviewItem = BdApi.React.memo(this.createPreviewItem);
    }

    start() {
        const { Webpack, ContextMenu } = BdApi;
        const { Filters } = Webpack;

        // Кэширование модулей при инициализации
        this.UserStore = Webpack.getModule(Filters.byProps("getUser"));
        this.UserProfileUtils = Webpack.getModule(Filters.byProps("getUserProfile"));
        this.ContextMenu = ContextMenu;

        // Константы для часто используемых значений
        this.CDN_URL = {
            AVATAR: "https://cdn.discordapp.com/avatars/",
            BANNER: "https://cdn.discordapp.com/banners/"
        };
        this.MAX_SIZE = "?size=1024";
        this.BANNER_REGEX = /^[a-zA-Z0-9_]+$/;

        ContextMenu.patch("user-context", this.handleUserContextMenu);
    }

    stop() {
        BdApi.ContextMenu.unpatch("user-context", this.handleUserContextMenu);
    }

    /**
     * Создает пункт меню для контекстного меню пользователя
     * @param {string} userId - ID пользователя
     * @returns {React.Element} Элемент контекстного меню
     */
    buildAvatarLinkMenuGroup(userId) {
        const { React, ContextMenu } = BdApi;
        return React.createElement(ContextMenu.Group, null,
            React.createElement(ContextMenu.Item, {
                id: "show-avatar-link",
                label: "Показать аватар и баннер",
                action: () => this.showMediaPreview(userId)
            })
        );
    }

    /**
     * Получает URL-адреса аватара и баннера пользователя
     * @param {string} userId - ID пользователя
     * @returns {Promise<Object>} Объект с URL-адресами и статусами
     */
    async getUserMediaUrls(userId) {
        const user = this.UserStore.getUser(userId);
        if (!user || !user.avatar) return { avatarUrl: null };

        const isAnimatedAvatar = user.avatar.startsWith("a_");
        const avatarExt = isAnimatedAvatar ? "gif" : "png";
        const avatarUrl = `${this.CDN_URL.AVATAR}${user.id}/${user.avatar}.${avatarExt}${this.MAX_SIZE}`;

        let bannerUrl = null;
        let isInvalidBanner = false;

        try {
            const fullProfile = await this.UserProfileUtils.getUserProfile(userId);
            if (fullProfile?.banner) {
                const bannerHash = fullProfile.banner;
                const isAnimatedBanner = bannerHash.startsWith("a_");
                const bannerExt = isAnimatedBanner ? "gif" : "png";

                // Проверка на валидность хеша баннера
                isInvalidBanner = !this.BANNER_REGEX.test(bannerHash) || bannerHash.includes("funky_kong");
                bannerUrl = `${this.CDN_URL.BANNER}${user.id}/${bannerHash}.${bannerExt}${this.MAX_SIZE}`;
            }
        } catch (e) {
            console.warn("Ошибка при получении профиля:", e);
        }

        return { avatarUrl, bannerUrl, isInvalidBanner };
    }

    /**
     * Копирует URL в буфер обмена с обработкой ошибок
     * @param {string} url - URL для копирования
     * @param {string} label - Метка для уведомления
     * @param {Function} setIsCopied - Функция для обновления состояния копирования
     */
    async copyToClipboard(url, label, setIsCopied) {
        try {
            await navigator.clipboard.writeText(url);
            setIsCopied(true);
            BdApi.showToast(`${label} скопирован!`, { type: "info" });
        } catch (e) {
            // Резервный метод копирования
            BdApi.copyText(url);
            setIsCopied(true);
            BdApi.showToast(`${label} скопирован через BdApi!`, { type: "info" });
        }

        // Сбрасываем состояние копирования через 3 секунды
        setTimeout(() => setIsCopied(false), 3000);
    }

    /**
     * Создает элемент предпросмотра для аватара/баннера
     * @param {Object} props - Свойства компонента
     * @returns {Array<React.Element>} Массив элементов React
     */
    createPreviewItem = ({ url, label, warning = false }) => {
        const { React } = BdApi;
        const [isCopied, setIsCopied] = React.useState(false);

        const handleCopyClick = () => {
            this.copyToClipboard(url, label, setIsCopied);
        };

        // Стили компонентов
        const styles = {
            image: {
                maxWidth: "100%",
                maxHeight: "300px",
                borderRadius: "12px",
                marginBottom: "10px",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(0,0,0,0.3)",
                objectFit: "contain"
            },
            warning: {
                color: "#faa61a",
                fontSize: "13px",
                marginBottom: "10px"
            },
            urlContainer: {
                fontSize: "14px",
                marginBottom: "10px"
            },
            url: {
                color: "#00aff4",
                textDecoration: "underline",
                wordBreak: "break-all"
            },
            button: {
                marginBottom: "25px",
                padding: "8px 16px",
                backgroundColor: isCopied ? "#4CAF50" : "#5865f2",
                border: "none",
                borderRadius: "6px",
                color: "#fff",
                cursor: "pointer",
                fontSize: "14px"
            }
        };

        return [
            React.createElement("img", {
                src: url,
                style: styles.image,
                title: `Нажмите, чтобы открыть ${label.toLowerCase()}`,
                onClick: () => window.open(url, "_blank")
            }),
            warning && React.createElement("div", {
                style: styles.warning
            }, `⚠️ ${label}: Хэш может быть невалидным, изображение может не загрузиться.`),
            React.createElement("div", {
                style: styles.urlContainer
            },
                React.createElement("a", {
                    href: url,
                    target: "_blank",
                    rel: "noreferrer",
                    style: styles.url
                }, url)
            ),
            React.createElement("button", {
                onClick: handleCopyClick,
                style: styles.button
            }, isCopied ? `Скопировано!` : `Скопировать ссылку на ${label.toLowerCase()}`)
        ];
    };

    /**
     * Показывает модальное окно с аватаром и баннером
     * @param {string} userId - ID пользователя
     */
    async showMediaPreview(userId) {
        const { avatarUrl, bannerUrl, isInvalidBanner } = await this.getUserMediaUrls(userId);
        
        if (!avatarUrl) return;

        const { React } = BdApi;
        const MediaPreview = () => React.createElement("div", {
            style: {
                textAlign: "center",
                padding: "10px",
                width: "420px",
                maxHeight: "90vh",
                backgroundColor: "#2f3136",
                color: "#fff",
                borderRadius: "8px",
                overflow: "auto",
                boxSizing: "border-box"
            }
        },
            bannerUrl && React.createElement("div", {
                style: { marginBottom: "5px" }
            }, React.createElement(this.PreviewItem, { url: bannerUrl, label: "Баннер", warning: isInvalidBanner })),

            React.createElement("div", null, 
                React.createElement(this.PreviewItem, { url: avatarUrl, label: "Аватар" })
            )
        );

        BdApi.alert("Профиль", React.createElement(MediaPreview));
    }

    /**
     * Обработчик для контекстного меню пользователя
     * @param {Object} menu - Меню контекста
     * @param {Object} props - Свойства контекста
     */
    handleUserContextMenu(menu, { user }) {
        if (!menu?.props?.children) return;
        menu.props.children.splice(
            menu.props.children.length - 1,
            0,
            this.buildAvatarLinkMenuGroup(user.id)
        );
    }
};