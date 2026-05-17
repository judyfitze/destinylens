// DestinyLens Branded Notification System
// Replaces default browser alerts with on-brand notifications

(function() {
    // Create notification container
    const container = document.createElement('div');
    container.id = 'dl-notifications';
    container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 12px;
        pointer-events: none;
    `;
    document.body.appendChild(container);

    // Notification styles
    const styles = document.createElement('style');
    styles.textContent = `
        .dl-notification {
            background: linear-gradient(145deg, rgba(35, 35, 55, 0.98) 0%, rgba(20, 20, 35, 0.99) 100%);
            border: 1px solid rgba(169, 76, 240, 0.3);
            border-radius: 16px;
            padding: 20px 24px;
            min-width: 320px;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(169, 76, 240, 0.15);
            backdrop-filter: blur(20px);
            transform: translateX(120%);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            pointer-events: auto;
            position: relative;
            overflow: hidden;
        }
        
        .dl-notification::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #A94CF0 0%, #F6C26B 100%);
        }
        
        .dl-notification.show {
            transform: translateX(0);
            opacity: 1;
        }
        
        .dl-notification.success {
            border-color: rgba(34, 197, 94, 0.4);
        }
        
        .dl-notification.success::before {
            background: linear-gradient(90deg, #22c55e 0%, #4ade80 100%);
        }
        
        .dl-notification.error {
            border-color: rgba(239, 68, 68, 0.4);
        }
        
        .dl-notification.error::before {
            background: linear-gradient(90deg, #ef4444 0%, #f87171 100%);
        }
        
        .dl-notification.warning {
            border-color: rgba(246, 194, 107, 0.4);
        }
        
        .dl-notification.warning::before {
            background: linear-gradient(90deg, #F6C26B 0%, #fcd34d 100%);
        }
        
        .dl-notification-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 8px;
        }
        
        .dl-notification-icon {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2rem;
            background: rgba(169, 76, 240, 0.15);
        }
        
        .dl-notification.success .dl-notification-icon {
            background: rgba(34, 197, 94, 0.15);
        }
        
        .dl-notification.error .dl-notification-icon {
            background: rgba(239, 68, 68, 0.15);
        }
        
        .dl-notification.warning .dl-notification-icon {
            background: rgba(246, 194, 107, 0.15);
        }
        
        .dl-notification-title {
            font-size: 1rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.02em;
        }
        
        .dl-notification-message {
            font-size: 0.9rem;
            color: rgba(255, 255, 255, 0.75);
            line-height: 1.5;
            margin-left: 48px;
        }
        
        .dl-notification-close {
            position: absolute;
            top: 16px;
            right: 16px;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            border: none;
            background: rgba(255, 255, 255, 0.05);
            color: rgba(255, 255, 255, 0.5);
            font-size: 1.2rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        .dl-notification-close:hover {
            background: rgba(255, 255, 255, 0.1);
            color: #fff;
        }
        
        @media (max-width: 480px) {
            #dl-notifications {
                left: 16px;
                right: 16px;
                top: 16px;
            }
            
            .dl-notification {
                min-width: auto;
                max-width: none;
                width: 100%;
            }
        }
    `;
    document.head.appendChild(styles);

    // Main notification function
    window.showDLNotification = function(options) {
        const {
            title = 'Notification',
            message = '',
            type = 'info', // info, success, error, warning
            duration = 5000,
            icon = null
        } = options;

        // Default icons
        const icons = {
            info: '✨',
            success: '✓',
            error: '✕',
            warning: '⚠'
        };

        // Create notification element
        const notification = document.createElement('div');
        notification.className = `dl-notification ${type}`;
        
        notification.innerHTML = `
            <button class="dl-notification-close" onclick="this.parentElement.remove()">×</button>
            <div class="dl-notification-header">
                <div class="dl-notification-icon">${icon || icons[type]}</div>
                <div class="dl-notification-title">${title}</div>
            </div>
            <div class="dl-notification-message">${message}</div>
        `;

        container.appendChild(notification);

        // Trigger animation
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        // Auto-remove after duration
        if (duration > 0) {
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => notification.remove(), 400);
            }, duration);
        }

        return notification;
    };

    // Convenience methods
    window.showDLSuccess = function(message, title = 'Success') {
        return window.showDLNotification({ title, message, type: 'success' });
    };

    window.showDLError = function(message, title = 'Error') {
        return window.showDLNotification({ title, message, type: 'error', duration: 8000 });
    };

    window.showDLWarning = function(message, title = 'Warning') {
        return window.showDLNotification({ title, message, type: 'warning', duration: 6000 });
    };

    window.showDLInfo = function(message, title = 'Info') {
        return window.showDLNotification({ title, message, type: 'info' });
    };

    // Override default alert for branded experience
    window.alert = function(message) {
        window.showDLNotification({
            title: 'Notice',
            message: message,
            type: 'info',
            duration: 4000
        });
    };

})();
