# 部署指南

使用 Caddy 提供 HTTPS 服务（443 端口），不占用 80 端口。

## 前提条件

- 域名已解析到服务器公网 IP
- 服务器已安装 Node.js >= 18、pnpm、Caddy
- 443 端口未被占用

## 1. 构建项目

```bash
cd /home/lx/Code/time
pnpm install && pnpm build
```

## 2. 配置 Caddy

编辑 `/etc/caddy/Caddyfile`：

```
{
    # 不监听 80 端口，使用 TLS-ALPN-01 验证方式申请证书
    http_port 0
}

your-domain.com {
    root * /home/lx/Code/time/packages/client/dist
    file_server
    try_files {path} /index.html

    reverse_proxy /api/* 127.0.0.1:3000

    tls {
        # TLS-ALPN-01 通过 443 端口完成验证，无需 80 端口
        # 如果使用自签证书或已有证书，替换为：
        # tls /path/to/cert.pem /path/to/key.pem
    }
}
```

> **证书验证说明**：`http_port 0` 禁用 80 端口后，Caddy 自动切换到 TLS-ALPN-01 方式通过 443 端口完成 Let's Encrypt 证书验证。若 Let's Encrypt 验证受限，也可手动指定已有证书：
>
> ```
> your-domain.com {
>     tls /etc/ssl/your-domain.com/cert.pem /etc/ssl/your-domain.com/key.pem
>     # ... 其余配置同上
> }
> ```

## 3. 配置后端服务

创建 `/etc/systemd/system/time-server.service`：

```ini
[Unit]
Description=Time Task Manager API
After=network.target

[Service]
Type=simple
User=lx
WorkingDirectory=/home/lx/Code/time/packages/server
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOST=127.0.0.1
Environment=JWT_SECRET=替换为随机密钥
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

生成随机密钥：

```bash
openssl rand -hex 32
```

## 4. 启动服务

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now time-server
sudo systemctl enable --now caddy
```

## 5. 防火墙

```bash
sudo ufw allow 443/tcp
# 无需开放 80 端口
```

## 6. 验证

```bash
# 检查后端
systemctl status time-server

# 检查 Caddy
systemctl status caddy

# 测试访问
curl -I https://your-domain.com
```

访问 `https://your-domain.com` 即可使用。
