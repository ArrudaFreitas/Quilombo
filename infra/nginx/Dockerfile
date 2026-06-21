FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
USER nginx
ENTRYPOINT ["/entrypoint.sh"]
