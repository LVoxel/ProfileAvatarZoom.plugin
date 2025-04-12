/**
 * @name ProfileAvatarContextMenuV2
 * @version 2.0.6
 * @description Плагин для просмотра аватара и баннера в Discord
 * @author salyamiii
 * @authorId 528185437399810081
 * @website https://github.com/LVoxel/ProfileAvatarZoom.plugin
 * @updateurl https://raw.githubusercontent.com/LVoxel/ProfileAvatarZoom.plugin/main/ProfileAvatarZoom2.plugin.js
 * @source https://raw.githubusercontent.com/LVoxel/ProfileAvatarZoom.plugin/main/ProfileAvatarZoom2.plugin.js
 */

module.exports = class ProfileAvatarContextMenuV2 {
    constructor() {
        this.handleUserContextMenu = this.handleUserContextMenu.bind(this);
        this.PreviewItem = BdApi.React.memo(this.createPreviewItem);
        this.activeWindow = null;
    }

    start() {
        const { Webpack, ContextMenu } = BdApi;
        const { Filters } = Webpack;

        // Кэширование модулей при инициализации
        this.UserStore = Webpack.getModule(Filters.byProps("getUser"));
        this.UserProfileUtils = Webpack.getModule(Filters.byProps("getUserProfile"));
        this.ContextMenu = ContextMenu;

        // Константы
        this.CDN_URL = {
            AVATAR: "https://cdn.discordapp.com/avatars/",
            BANNER: "https://cdn.discordapp.com/banners/"
        };
        this.MAX_SIZE = "?size=1024";
        this.BANNER_REGEX = /^[a-zA-Z0-9_]+$/;

        ContextMenu.patch("user-context", this.handleUserContextMenu);
        
        this.addStyles();
    }

    stop() {
        BdApi.ContextMenu.unpatch("user-context", this.handleUserContextMenu);
        // Удаляем добавленные стили
        BdApi.DOM.removeStyle("ProfileAvatarDraggableWindow");
        // Закрываем активное окно, если оно есть
        if (this.activeWindow) {
            this.closePreviewWindow(this.activeWindow);
        }
    }

    // Добавляем стили для перемещаемого окна
    addStyles() {
        const styles = `
            .profile-avatar-draggable-window {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: #2f3136;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
                color: #fff;
                z-index: 9999;
                overflow: hidden;
                width: 420px;
                max-height: 90vh;
                display: flex;
                flex-direction: column;
                opacity: 0;
                transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                transform-origin: center center;
                pointer-events: none;
            }
            .profile-avatar-draggable-window.visible {
                opacity: 1;
                transform: translate(-50%, -50%) scale(1);
                pointer-events: all;
            }
            .profile-avatar-draggable-window.closing {
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
                transition: opacity 0.2s ease, transform 0.2s ease;
            }
            .profile-avatar-draggable-window.no-translate {
                transition: none;
            }
            .profile-avatar-window-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 12px 16px;
                background-color: #202225;
                cursor: move;
                user-select: none;
                border-top-left-radius: 8px;
                border-top-right-radius: 8px;
            }
            .profile-avatar-window-title {
                font-weight: 500;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.2s;
                padding: 4px 8px;
                border-radius: 4px;
            }
            .profile-avatar-window-title:hover {
                background-color: #36393f;
            }
            .profile-avatar-window-title:active {
                background-color: #40444b;
            }
            .hidden-username {
                opacity: 0;
                display: inline-block;
                background-color: #40444b;
                border-radius: 4px;
                padding: 0 4px;
                margin-left: 4px;
                transition: opacity 0.3s ease;
            }
            .show-username {
                opacity: 1;
            }
            .profile-avatar-window-close {
                color: #dcddde;
                opacity: 0.7;
                background: none;
                border: none;
                cursor: pointer;
                font-size: 20px;
                line-height: 1;
                padding: 0 8px;
                transition: opacity 0.2s, transform 0.2s;
            }
            .profile-avatar-window-close:hover {
                opacity: 1;
                transform: scale(1.1);
            }
            .profile-avatar-window-content {
                padding: 16px;
                overflow-y: auto;
                text-align: center;
            }
            .profile-avatar-img {
                max-width: 100%;
                max-height: 300px;
                border-radius: 12px;
                margin-bottom: 12px;
                cursor: pointer;
                box-shadow: 0 8px 20px rgba(0,0,0,0.5);
                object-fit: contain;
                transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
            }
            .profile-avatar-img:hover {
                transform: scale(1.02);
                box-shadow: 0 12px 28px rgba(0,0,0,0.6);
            }
            .profile-avatar-warning {
                color: #faa61a;
                font-size: 13px;
                margin-bottom: 10px;
            }
            .profile-avatar-url-container {
                font-size: 14px;
                margin-bottom: 10px;
            }
            .profile-avatar-url {
                color: #00aff4;
                text-decoration: underline;
                word-break: break-all;
            }
            .profile-avatar-button {
                margin-bottom: 20px;
                padding: 8px 16px;
                background-color: #5865f2;
                border: none;
                border-radius: 4px;
                color: #fff;
                cursor: pointer;
                font-size: 14px;
                transition: background-color 0.2s, transform 0.2s;
            }
            .profile-avatar-button.copied {
                background-color: #4CAF50;
            }
            .profile-avatar-button:hover {
                background-color: #4752c4;
                transform: translateY(-2px);
            }
            .profile-avatar-button.copied:hover {
                background-color: #3e9142;
            }
            .profile-avatar-section {
                margin-bottom: 20px;
                opacity: 0;
                transform: translateY(10px);
                animation: fadeInUp 0.4s forwards;
            }
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            .profile-avatar-section:nth-child(2) {
                animation-delay: 0.1s;
            }
        `;
        BdApi.DOM.addStyle("ProfileAvatarDraggableWindow", styles);
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
                label: "🔍 Показать аватар и баннер",
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
        if (!user || !user.avatar) return { avatarUrl: null, username: null };

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
            console.warn("❌ Ошибка при получении профиля:", e);
        }

        return { avatarUrl, bannerUrl, isInvalidBanner, username: user.username };
    }

    /**
     * Копирует URL в буфер обмена с обработкой ошибок
     * @param {string} url - URL для копирования
     * @param {string} label - Метка для уведомления
     * @param {Element} button - Кнопка для обновления состояния
     */
    async copyToClipboard(url, label, button) {
        try {
            await navigator.clipboard.writeText(url);
            button.textContent = `✅ Скопировано!`;
            button.classList.add("copied");
            BdApi.showToast(`✅ ${label} скопирован!`, { type: "info" });
        } catch (e) {
            // Резервный метод копирования
            BdApi.copyText(url);
            button.textContent = `✅ Скопировано!`;
            button.classList.add("copied");
            BdApi.showToast(`📋 ${label} скопирован через BdApi!`, { type: "info" });
        }

        // Сбрасываем состояние копирования через 3 секунды
        setTimeout(() => {
            button.textContent = `📋 Скопировать ссылку на ${label.toLowerCase()}`;
            button.classList.remove("copied");
        }, 3000);
    }

    /**
     * Создает секцию для просмотра медиа (аватар или баннер)
     * @param {Object} options - Параметры секции
     * @returns {Element} DOM-элемент секции
     */
    createMediaSection({ url, label, warning = false }) {
        // Создаем контейнер
        const section = document.createElement("div");
        section.className = "profile-avatar-section";
        
        // Создаем изображение
        const img = document.createElement("img");
        img.src = url;
        img.className = "profile-avatar-img";
        img.title = `🖱️ Нажмите, чтобы открыть ${label.toLowerCase()}`;
        img.onclick = () => window.open(url, "_blank");
        section.appendChild(img);
        
        // Добавляем предупреждение, если нужно
        if (warning) {
            const warningEl = document.createElement("div");
            warningEl.className = "profile-avatar-warning";
            warningEl.textContent = `⚠️ ${label}: Хэш может быть невалидным, изображение может не загрузиться.`;
            section.appendChild(warningEl);
        }
        
        const urlContainer = document.createElement("div");
        urlContainer.className = "profile-avatar-url-container";
        
        const urlLink = document.createElement("a");
        urlLink.href = url;
        urlLink.target = "_blank";
        urlLink.rel = "noreferrer";
        urlLink.className = "profile-avatar-url";
        urlLink.textContent = url;
        
        urlContainer.appendChild(urlLink);
        section.appendChild(urlContainer);
        
        const copyButton = document.createElement("button");
        copyButton.className = "profile-avatar-button";
        copyButton.textContent = `📋 Скопировать ссылку на ${label.toLowerCase()}`;
        copyButton.onclick = () => this.copyToClipboard(url, label, copyButton);
        section.appendChild(copyButton);
        
        return section;
    }

    /**
     * Закрывает окно с анимацией
     * @param {Element} window - Окно, которое нужно закрыть
     */
	closePreviewWindow(window) {
		if (!window) return;

		window.classList.add("closing");

		setTimeout(() => {
			if (window.parentNode) {
				window.parentNode.removeChild(window);
			}
			if (this.activeWindow === window) {
				this.activeWindow = null;
			}
		}, 300); // Время должно совпадать с длительностью transition (0.2s + запас 100ms)
	}

    /**
     * Переключает видимость имени пользователя
     * @param {Element} usernameElement - Элемент с именем пользователя
     */
    toggleUsername(usernameElement) {
        usernameElement.classList.toggle("show-username");
    }

    /**
     * Создает и показывает перемещаемое окно с предпросмотром аватара и баннера
     * @param {string} userId - ID пользователя
     */
    async showMediaPreview(userId) {
        // Закрываем предыдущее окно, если оно открыто
        if (this.activeWindow) {
            this.closePreviewWindow(this.activeWindow);
        }

        const { avatarUrl, bannerUrl, isInvalidBanner, username } = await this.getUserMediaUrls(userId);
        
        if (!avatarUrl) return;

        // Создаем окно
        const window = document.createElement("div");
        window.className = "profile-avatar-draggable-window";
        this.activeWindow = window;

        const header = document.createElement("div");
        header.className = "profile-avatar-window-header";
        
        const title = document.createElement("div");
        title.className = "profile-avatar-window-title";
        
        const baseTitle = document.createTextNode("✅ Профиль");
        title.appendChild(baseTitle);
        
        const usernameSpan = document.createElement("span");
        usernameSpan.className = "hidden-username";
        usernameSpan.textContent = `@${username}`;
        title.appendChild(usernameSpan);

        title.onclick = () => this.toggleUsername(usernameSpan);
        
        const closeButton = document.createElement("button");
        closeButton.className = "profile-avatar-window-close";
        closeButton.innerHTML = "✖";
        closeButton.onclick = () => {
            this.closePreviewWindow(window);
        };
        
        header.appendChild(title);
        header.appendChild(closeButton);
        window.appendChild(header);

        // Содержимое окна
        const content = document.createElement("div");
        content.className = "profile-avatar-window-content";

        // Добавляем баннер, если он есть
        if (bannerUrl) {
            content.appendChild(this.createMediaSection({
                url: bannerUrl,
                label: "Баннер",
                warning: isInvalidBanner
            }));
        }

        // Добавляем аватар
        content.appendChild(this.createMediaSection({
            url: avatarUrl,
            label: "Аватар"
        }));

        window.appendChild(content);

        document.body.appendChild(window);
        this.makeDraggable(window, header);
        requestAnimationFrame(() => {
            window.classList.add("visible");
        });
    }

    /**
     * Делает элемент перетаскиваемым
     * @param {Element} element - Элемент, который нужно перетаскивать
     * @param {Element} handle - Элемент, за который можно тянуть
     */
	makeDraggable(element, handle) {
		let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
		let isDragging = false;
	
		handle.onmousedown = dragMouseDown;
	
		function dragMouseDown(e) {
			e.preventDefault();
			
			pos3 = e.clientX;
			pos4 = e.clientY;
        
			document.onmouseup = closeDragElement;
			document.onmousemove = elementDrag;
			
			isDragging = true;
		}

		function elementDrag(e) {
			if (!isDragging) return;

			e.preventDefault();

			pos1 = pos3 - e.clientX;
			pos2 = pos4 - e.clientY;
			pos3 = e.clientX;
			pos4 = e.clientY;

			element.style.top = (element.offsetTop - pos2) + "px";
			element.style.left = (element.offsetLeft - pos1) + "px";
		}

		function closeDragElement() {
			document.onmouseup = null;
			document.onmousemove = null;
			isDragging = false;
		}
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