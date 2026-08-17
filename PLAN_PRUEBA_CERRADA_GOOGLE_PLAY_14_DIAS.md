# Plan de prueba cerrada de Google Play — 14 días

**Aplicación:** Hacienda de Letras
**Versión Android a validar:** 1.0.9, compilación 15
**Periodo de prueba:** lunes 17 al domingo 30 de agosto de 2026
**Fecha límite de publicación en tiendas:** 3 de septiembre de 2026
**Objetivo:** comprobar con personas reales que la app Android y el Centro de Control completan los procesos principales y, en paralelo, que el equipo interno de ALQIA valide la versión iOS antes de continuar la publicación en tiendas.

## 1. Instrucción sencilla para testers

Del 17 al 30 de agosto cada participante realizará una actividad corta en la app. No se busca que conozca tecnología: se busca confirmar que una persona puede entender la pantalla, completar la acción y recibir el resultado correcto.

Cada tester debe:

1. Aceptar la invitación de prueba con la misma cuenta de Google que utiliza en Play Store.
2. Instalar la app desde el enlace privado de Google Play.
3. Usar un teléfono real; no compartir usuario ni contraseña.
4. Realizar la actividad asignada del día.
5. Reportar incluso cuando todo haya funcionado correctamente.
6. Mantener la app instalada y participar durante todo el periodo solicitado por Google Play.

## 2. Preparación antes del Día 1

La persona responsable del Centro de Control debe dejar listos datos exclusivos para prueba:

- Al menos dos vinos publicados, con precio y existencia.
- Una promoción vigente claramente marcada como prueba, si se evaluarán promociones.
- Una experiencia publicada con varios horarios futuros y cupo limitado.
- Un restaurante publicado con reservaciones activas y varios horarios.
- Un paquete de cabaña publicado, una unidad física activa y fechas libres.
- Un evento futuro publicado con, al menos, dos tipos de boleto, precio y cupo reducido.
- Una sede para cotización de celebración.
- Cuentas de operación autorizadas para atender reservaciones, órdenes y Check-in.
- Método de pago de prueba o una operación de importe controlado aprobada por Hacienda.
- Actualización central necesaria para boletos QR y tipos de reservación publicada antes de probar esos recorridos.

Si esta preparación no está completa, el día correspondiente debe registrarse como **bloqueado por falta de datos**, no como “aprobado”.

**Datos de prueba ya preparados el 16 de agosto de 2026:** ambos restaurantes publicados cuentan con horarios mock de 11:00 a 17:30 cada 30 minutos; las cinco experiencias publicadas cuentan con tres horarios mock cada una, para el 17, 23 y 29 de agosto. Estos datos son exclusivos para validación y deben confirmarse o sustituirse antes de la operación comercial.

## 3. Calendario de 14 días

| Día y fecha | Qué se revisa | Actividad del tester | Qué debe revisar Hacienda en el Centro de Control | Resultado esperado |
|---|---|---|---|---|
| **1 · Lun 17 ago** | Instalación y primera impresión | Instalar, abrir, recorrer Inicio y localizar las cinco secciones principales. | Verificar que la aplicación abre sin errores y que la actividad queda registrada. | Instalación clara, textos legibles y navegación entendible. |
| **2 · Mar 18 ago** | Cuenta y acceso | Crear cuenta, cerrar sesión, volver a entrar y probar recuperación de contraseña si está habilitada. | Confirmar que aparece un solo cliente y que sus datos básicos son correctos. | Acceso estable, sin cuentas duplicadas ni pantallas bloqueadas. |
| **3 · Mié 19 ago** | Perfil, domicilio y privacidad | Editar nombre o fotografía, registrar un domicilio completo, marcarlo como principal y abrir términos, privacidad y eliminación de cuenta. | Confirmar actualización de datos; no completar una eliminación real salvo que sea una cuenta creada para ello. | Los datos se guardan y siguen visibles al volver a abrir la app. |
| **4 · Jue 20 ago** | Contenido general | Revisar Inicio, vinos, experiencias, eventos, cabañas, restaurantes y mapa. | Comparar contra lo publicado y comprobar que un borrador no aparezca. | La app muestra sólo contenido activo y publicado, con imágenes y textos correctos. |
| **5 · Vie 21 ago** | Vinos y carrito | Abrir dos vinos, agregar, cambiar cantidades y eliminar uno. Cerrar y volver a abrir la app. | Revisar el carrito del cliente y su actividad. | Cantidades e importes correctos; el carrito se conserva sin duplicarse. |
| **6 · Sáb 22 ago** | Compra, domicilio y pago | Intentar comprar sin domicilio completo, corregirlo y completar la orden con el método autorizado. | Confirmar una sola orden, pago y domicilio de entrega; moverla a preparación. | La app bloquea datos incompletos y luego muestra el resultado correcto del pago. |
| **7 · Dom 23 ago** | Experiencias y cupo | Reservar una experiencia; otro tester intenta usar el cupo restante. Probar también un horario lleno. | Confirmar reservaciones, personas y reducción correcta del cupo. | Sólo se ofrecen horarios futuros con disponibilidad; no existe sobreventa. |
| **8 · Lun 24 ago** | Cambios y cancelación | Cambiar la fecha o número de personas de una reservación y después cancelar una reservación de prueba. | Revisar historial, notas y devolución de cupo al horario. | El estado cambia en ambos lados y el cupo se libera correctamente. |
| **9 · Mar 25 ago** | Restaurante | Elegir restaurante, fecha, horario, personas y enviar solicitud. | Localizarla en Reservaciones, confirmar o actualizar su estado. | Sólo aparecen horarios configurados y la solicitud llega una sola vez. |
| **10 · Mié 26 ago** | Cabaña | Solicitar una estancia con fechas y huéspedes; un segundo tester intenta las mismas fechas si el cupo ya fue tomado. | Asignar unidad, revisar calendario, cambiar fecha y cancelar la prueba. | No hay doble reservación y el calendario se actualiza al cambiar o cancelar. |
| **11 · Jue 27 ago** | Evento y boleto | Abrir un evento, elegir tipo y cantidad de boletos, pagar con el método autorizado y abrir “Mis boletos y accesos”. | Confirmar orden, pago, reducción de cupo y emisión de accesos. | Cada boleto pagado aparece con folio y QR; no se emiten accesos sin pago aprobado. |
| **12 · Vie 28 ago** | Entrada con QR | Mostrar el QR para escanearlo; intentar escanearlo por segunda vez y probar un acceso cancelado. | Usar Check-in y revisar el registro de cada intento. | El válido entra una vez; el repetido o cancelado es rechazado con un mensaje claro. |
| **13 · Sáb 29 ago** | Condiciones reales y facilidad de uso | Usar datos móviles o señal débil, cerrar y reabrir, cambiar tamaño de letra del teléfono y repetir acciones principales. | Revisar si quedaron operaciones a medias o duplicadas. | No hay cobros ni reservaciones dobles; botones y textos siguen siendo utilizables. |
| **14 · Dom 30 ago** | Revisión final | Repetir los casos que tuvieron fallas y completar una encuesta corta de comprensión y confianza. | Verificar correcciones, reunir evidencias y clasificar cualquier pendiente. | No quedan fallas críticas; existe una decisión documentada de aprobación u observaciones. |

## 4. Testeo paralelo de iOS realizado por ALQIA

La prueba cerrada de Google Play corresponde a Android. **La versión iOS será probada internamente por el equipo de ALQIA durante los mismos 14 días**, utilizando los mismos datos y recorridos para comprobar que ambas aplicaciones se comportan de manera consistente.

| Periodo | Revisión interna de iOS por ALQIA | Evidencia esperada |
|---|---|---|
| **Días 1 y 2** | Instalación, apertura, registro, acceso y recuperación de cuenta. | Equipo, versión de iOS, resultado y captura si existe una diferencia. |
| **Días 3 y 4** | Perfil, domicilios, privacidad, navegación, textos, imágenes y tamaños de pantalla. | Lista de pantallas revisadas y cualquier detalle visual encontrado. |
| **Días 5 y 6** | Vinos, carrito, cantidades, domicilio, compra y estados de pago. | Orden de prueba y confirmación de que no hubo duplicados. |
| **Días 7 al 10** | Experiencias, cambios, cancelaciones, restaurantes y cabañas. | Folios y confirmación de que el Centro de Control recibió cada operación. |
| **Días 11 y 12** | Eventos, boletos, QR y Check-in. | Acceso válido, segundo uso rechazado y registro en Centro de Control. |
| **Días 13 y 14** | Interrupciones, cambio de red, reapertura y repetición de correcciones. | Resultado final de regresión y autorización interna de cierre. |

Cada incidencia debe indicar **Android o iOS**. Cuando el mismo proceso exista en ambas plataformas, ALQIA comprobará las dos antes de marcarlo como resuelto.

La validación interna de ALQIA no reemplaza la revisión oficial que realiza Apple antes de publicar la aplicación.

## 5. Preguntas sencillas al terminar cada día

Cada tester debe responder:

1. ¿Pudiste completar la actividad? **Sí / No / Con dificultad**.
2. ¿Entendiste qué debías hacer sin ayuda? **Sí / No**.
3. ¿El resultado fue el que esperabas? **Sí / No**.
4. ¿Algún texto, botón o imagen se veía cortado o demasiado grande? **Sí / No**.
5. ¿La app se cerró, se congeló o te hizo repetir la acción? **Sí / No**.
6. Del 1 al 5, ¿qué tanta confianza te dio la aplicación?
7. Comentario breve: ¿qué mejorarías antes de publicarla?

## 6. Formato para reportar una falla

Copiar y completar este bloque:

```text
Fecha:
Nombre del tester:
Plataforma: Android / iOS
Modelo del teléfono y versión del sistema:
Sección de la app:
Qué intenté hacer:
Pasos que seguí:
Qué esperaba que ocurriera:
Qué ocurrió realmente:
¿Pude continuar?: Sí / No
¿Se repitió?: Sí / No
Captura o video:
```

No incluir contraseñas, números completos de tarjeta ni información sensible en capturas o mensajes.

## 7. Prioridad de los reportes

| Nivel | Significado en lenguaje sencillo | Ejemplos |
|---|---|---|
| **Crítico** | Impide usar o puede causar pérdida de dinero, cupo o acceso. | No abre, no permite entrar, cobro duplicado, sobreventa, QR inválido después de pagar. |
| **Alto** | Una función importante no termina, aunque la app siga abierta. | No guarda domicilio, no llega la reservación, no aparece la orden. |
| **Medio** | Se puede continuar con dificultad o existe una salida temporal. | Mensaje poco claro, pantalla que obliga a volver atrás. |
| **Bajo** | Detalle visual o de redacción que no impide completar la acción. | Texto desalineado, espacio irregular, palabra mejorable. |

## 8. Evidencia mínima que debe conservarse

Al cierre de la prueba deben existir:

- Lista de testers participantes y días en los que probaron.
- Respuestas diarias, incluso de quienes no encontraron fallas.
- Modelos de teléfono y versiones de Android utilizadas.
- Registro interno de dispositivos y versiones de iOS revisados por ALQIA.
- Capturas de contenido publicado y del mismo contenido visible en la app.
- Folios de prueba de compras, reservaciones, cotizaciones y boletos.
- Evidencia del primer escaneo QR aprobado y del segundo escaneo rechazado.
- Registro de fallas, prioridad, responsable, solución y nueva validación.
- Encuesta final y conclusión firmada por la persona responsable.

Los folios y capturas que se compartan fuera del equipo deben ocultar datos personales y de pago.

## 9. Criterio para cerrar los 14 días

La prueba puede cerrarse como satisfactoria cuando:

- Participó durante el periodo completo la cantidad de testers exigida en la cuenta de Google Play.
- ALQIA completó y documentó internamente el recorrido equivalente en iOS.
- No quedan reportes críticos o altos sin resolver.
- Compras, pagos, reservaciones, disponibilidad y QR fueron comprobados de principio a fin.
- No se detectaron cobros, órdenes, reservaciones o accesos duplicados.
- El contenido del Centro de Control coincide con lo que ve el cliente.
- Los testers entienden las acciones principales sin explicación técnica.
- Los detalles menores pendientes tienen responsable y fecha acordada.

## 10. Control diario del responsable

| Día | Testers Android activos | Android completado | Revisión ALQIA iOS | Fallas críticas | Fallas altas | Evidencia recibida | Responsable confirma |
|---:|---:|---|---|---:|---:|---|---|
| 1 |  | ☐ | ☐ |  |  | ☐ |  |
| 2 |  | ☐ | ☐ |  |  | ☐ |  |
| 3 |  | ☐ | ☐ |  |  | ☐ |  |
| 4 |  | ☐ | ☐ |  |  | ☐ |  |
| 5 |  | ☐ | ☐ |  |  | ☐ |  |
| 6 |  | ☐ | ☐ |  |  | ☐ |  |
| 7 |  | ☐ | ☐ |  |  | ☐ |  |
| 8 |  | ☐ | ☐ |  |  | ☐ |  |
| 9 |  | ☐ | ☐ |  |  | ☐ |  |
| 10 |  | ☐ | ☐ |  |  | ☐ |  |
| 11 |  | ☐ | ☐ |  |  | ☐ |  |
| 12 |  | ☐ | ☐ |  |  | ☐ |  |
| 13 |  | ☐ | ☐ |  |  | ☐ |  |
| 14 |  | ☐ | ☐ |  |  | ☐ |  |

## 11. Cierre formal

**Periodo probado:** del 17 al 30 de agosto de 2026
**Fecha límite de publicación en tiendas:** 3 de septiembre de 2026
**Número de testers que completaron el periodo:** ______________
**Validación interna iOS realizada por ALQIA:** ☐ Sí  ☐ Con observaciones
**Casos ejecutados:** __________
**Casos aprobados:** __________
**Pendientes menores aceptados:** __________

**Decisión:** ☐ Aprobada para continuar  ☐ Aprobada con observaciones  ☐ Requiere nuevo ciclo

**Responsable Hacienda de Letras:** ______________________________________
**Responsable de implementación:** _______________________________________
**Fecha y firma:** _______________________________________________________
