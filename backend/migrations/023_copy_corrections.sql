begin;

update public.wines
set description = replace(description, 'catalogo inicial', 'catálogo inicial')
where description like '%catalogo inicial%';

update public.experiences
set description = replace(description, 'catalogo inicial', 'catálogo inicial')
where description like '%catalogo inicial%';

update public.events
set description = replace(description, 'catalogo inicial', 'catálogo inicial')
where description like '%catalogo inicial%';

commit;
