# Локальная галерея Action

Запуск из корня Grid Studio (Python 3.9+; без дополнительных пакетов):

```sh
python3 gallery-prototype/server.py
```

Галерея: http://127.0.0.1:8767/gallery-prototype/
Админка: http://127.0.0.1:8767/gallery-prototype/admin.html
Ключ для входа: локальный файл `.local-data/admin-key` в этой папке.

## Проверка сценария

1. В админке выберите «Приём работ». В галерее отправьте изображение, название и имя. Работа появится в «Мои работы» со статусом модерации.
2. Одобрите работу в админке. До одобрения она недоступна другим участникам, включая прямой адрес изображения.
3. Перейдите к голосованию. Откройте изображение и поставьте лайк. У каждого участника максимум три лайка на разные работы; лайк можно снять и перенести. В админке есть три независимых тестовых участника.
4. «Впечатления» закрывает голосование и показывает только работы хотя бы с одним лайком. Любой участник может оставить на такую работу один редактируемый ответ из 1–3 слов.
5. В админке одобрите ответы в разделе «Слова участников»: они сразу появятся на сфере. Неодобренные ответы скрыты; редактирование возвращает ответ на модерацию. «Завершить сбор ответов» закрывает ввод и сохраняет итоговый показ. Показ слов и фильтр можно менять вручную.

Для быстрого старта в админке можно добавить шесть демо-работ на модерацию. Данные сохраняются в SQLite после обновления и перезапуска. Возврат к предыдущему этапу сохраняет результаты. Снятие работы с публикации удаляет её голоса и ответы; повторное одобрение начинает их сбор заново.

## Границы локальной версии

Одна встреча, без регистрации. Участник определяется браузером; другой браузер, очистка данных или другой тестовый профиль создают нового участника. Это не защита от повторного голосования одним человеком. Сервер слушает только этот компьютер: ссылка и QR для телефонов потребуют размещения онлайн. GitHub хранит исходники; GitHub Pages может показать только визуальный прототип без общего сервера. База и ключ исключены из Git.

Онлайн-этап: HTTPS-хостинг сервера и постоянной базы, способ идентификации участников, ограничения загрузок/частоты запросов, резервное копирование, общая ссылка и её QR. Не публикуйте локальную папку данных через обычный статический сервер.

## Проверка

```sh
python3 gallery-prototype/test_server.py
```

Проверяет модерацию, закрытые этапы, параллельное ограничение трёх голосов, независимость участников, ответы и доступ к служебным файлам. Визуально проверены лайк, сохранение ответа и переключение этапов в браузере.

## Online gallery (Supabase)

GitHub Pages serves the same gallery and admin paths. `cloud-config.js` contains only the project URL and publishable key. The bundled client is supabase-js 2.118.0. Never put secret/service-role keys in the frontend.

Apply `supabase/schema.sql` once in a new project. Add the administrator's confirmed email separately to `gallery_private.admins`; enable anonymous sign-ins and set Site URL to the published admin page. The free default email template uses a one-time sign-in link. Only an email-confirmed, non-anonymous account in the admin allowlist can moderate or change stages.

Images use a private Storage bucket with 5 MB limit. Pending images are visible only to their author and admin; approved images are available through short-lived signed URLs. Impressions are independent of works. The database enforces three likes, stage restrictions, and moderation permissions. Anonymous identity is per browser: another browser or cleared storage can create another participant, so this is a workshop voting limit, not verified-person voting.

On localhost the original Python/SQLite workflow remains active. Append `?cloud` to test Supabase locally. Cloud failure is shown as an error instead of silently falling back to demo works.

## Этапы встречи в админке

Ведущая переключает четыре этапа кнопкой «Далее»: завершение практики и отправка работ (43:00), голосование, впечатления, итоговый показ и обсуждение. Текущий этап выделен в списке и сохраняется после обновления страницы. Кнопка «Назад» возвращает на предыдущий этап, сохраняя работы, голоса и ответы; на первом этапе она недоступна. Настройки показа всегда видны под заголовком. Используются существующие этапы галереи; обновление базы не требуется.
