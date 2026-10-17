FROM php:8.4-apache

ENV APACHE_PORT=8089
RUN sed -i 's/Listen 80/Listen ${APACHE_PORT}/' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${APACHE_PORT}>/' /etc/apache2/sites-available/000-default.conf \
    && sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf
