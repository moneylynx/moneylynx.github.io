import { useState } from 'react';
import { fmtEur, fDate } from '../lib/helpers.js';

// ─── MoneyLynx Logo Icon ─────────────────────────────────────────────────────
const LYNX_ICON = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB3aWR0aD0iMTAwJSIKICAgaGVpZ2h0PSIxMDAlIgogICB2aWV3Qm94PSIwIDAgNDMuODUwNzg0IDU4LjY1MTQ3NCIKICAgdmVyc2lvbj0iMS4xIgogICBpZD0ic3ZnMSIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMS40LjIgKGY0MzI3ZjQsIDIwMjUtMDUtMTMpIgogICBzb2RpcG9kaTpkb2NuYW1lPSJNb25leUx5bnhfMC5zdmciCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPHNvZGlwb2RpOm5hbWVkdmlldwogICAgIGlkPSJuYW1lZHZpZXcxIgogICAgIHBhZ2Vjb2xvcj0iI2YzZjNmMyIKICAgICBib3JkZXJjb2xvcj0iI2ZmZmZmZiIKICAgICBib3JkZXJvcGFjaXR5PSIxIgogICAgIGlua3NjYXBlOnNob3dwYWdlc2hhZG93PSIwIgogICAgIGlua3NjYXBlOnBhZ2VvcGFjaXR5PSIwIgogICAgIGlua3NjYXBlOnBhZ2VjaGVja2VyYm9hcmQ9IjEiCiAgICAgaW5rc2NhcGU6ZGVza2NvbG9yPSIjNTA1MDUwIgogICAgIGlua3NjYXBlOmRvY3VtZW50LXVuaXRzPSJtbSIKICAgICBpbmtzY2FwZTp6b29tPSIwLjg5MTc0MzgzIgogICAgIGlua3NjYXBlOmN4PSI4Mi45ODM0NzMiCiAgICAgaW5rc2NhcGU6Y3k9IjIwMS4yOTA5OSIKICAgICBpbmtzY2FwZTp3aW5kb3ctd2lkdGg9IjE4OTIiCiAgICAgaW5rc2NhcGU6d2luZG93LWhlaWdodD0iMTM0NCIKICAgICBpbmtzY2FwZTp3aW5kb3cteD0iMTY4NiIKICAgICBpbmtzY2FwZTp3aW5kb3cteT0iMjI2IgogICAgIGlua3NjYXBlOndpbmRvdy1tYXhpbWl6ZWQ9IjAiCiAgICAgaW5rc2NhcGU6Y3VycmVudC1sYXllcj0ibGF5ZXIxIiAvPgogIDxkZWZzCiAgICAgaWQ9ImRlZnMxIiAvPgogIDxnCiAgICAgaW5rc2NhcGU6bGFiZWw9IkxheWVyIDEiCiAgICAgaW5rc2NhcGU6Z3JvdXBtb2RlPSJsYXllciIKICAgICBpZD0ibGF5ZXIxIgogICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKC04My4wNzkxNjUsLTExOS4wNjI1KSI+CiAgICA8cGF0aAogICAgICAgc3R5bGU9ImZpbGw6IzM4QkRGOCIKICAgICAgIGQ9Im0gMTAyLjE0OTA2LDE3Ny40NDc4NyBjIC0xLjA0MTcsLTAuMTk4OSAtMi41Mjk5ODMsLTAuNTY5OTggLTMuMzA3MjkzLC0wLjgyNDY0IC0wLjc3NzMyLC0wLjI1NDY1IC0yLjEyNzY3LC0wLjgxNzY2IC0zLjAwMDgsLTEuMjUxMTMgLTAuODczMTIsLTAuNDMzNDcgLTIuMzA3NSwtMS4yOTg2NiAtMy4xODc1MSwtMS45MjI2NSAtMC44ODAwMSwtMC42MjM5OSAtMi4zMjgyMywtMS45MTI5OSAtMy4yMTgyNywtMi44NjQ0NSAtMC44OTAwNCwtMC45NTE0NSAtMS45OTE5NCwtMi4yNzMwNCAtMi40NDg2NiwtMi45MzY4NyAtMC40NTY3MiwtMC42NjM4MiAtMS4yMzkwMywtMi4wNjk0NSAtMS43Mzg0NiwtMy4xMjM2MiAtMC40OTk0MywtMS4wNTQxOCAtMS4xNDEyNCwtMi44MzE3NCAtMS40MjYyNSwtMy45NTAxNSAtMC4yODUsLTEuMTE4NDEgLTAuNTk2NzgsLTMuMDIzNCAtMC42OTI4MywtNC4yMzMzMyAtMC4wOTg2LC0xLjI0MTY0IC0wLjA0NjcsLTMuMTA3MzIgMC4xMTksLTQuMjgzMTcgMC4xNjE1MSwtMS4xNDU4MSAwLjY1MTczLC0zLjE1MjA4IDEuMDg5MzgsLTQuNDU4MzggMC40Mzc2NSwtMS4zMDYzIDEuMjczNzIsLTMuMTkzNTMgMS44NTc5NCwtNC4xOTM4NSAwLjU4NDIyLC0xLjAwMDMyIDEuNzQzMzMsLTIuNTU2NzEgMi41NzU4MSwtMy40NTg2NCAwLjgzMjQ4LC0wLjkwMTk0IDIuMjExMzEsLTIuMTU1MTEgMy4wNjQwNiwtMi43ODQ4MyAwLjg1Mjc2LC0wLjYyOTczIDEuNjQ0NzgsLTEuMTQ0OTUgMS43NjAwNiwtMS4xNDQ5NSAwLjExNTI4LDAgMC4zMzEzLDAuMzQ5MTIgMC40ODAwNSwwLjc3NTgzIDAuMjYyMjUsMC43NTIzIDAuMjE1MDcsMC44MTYyNiAtMS41NTQ5LDIuMTA3NjcgLTEuMDAzOTUsMC43MzI1MSAtMi4zOTM5NCwyLjA1OTE2IC0zLjA4ODg1LDIuOTQ4MTMgLTAuNjk0OTIsMC44ODg5NiAtMS42NDc0NCwyLjM1MTUyIC0yLjExNjczLDMuMjUwMTQgLTAuNDY5MjksMC44OTg2MiAtMS4wODkzOCwyLjMyNjgxIC0xLjM3Nzk4LDMuMTczNzYgLTAuMjg4NiwwLjg0Njk1IC0wLjY3MTk0LDIuNzE5NDYgLTAuODUxODYsNC4xNjExMyAtMC4yNjM0LDIuMTEwNTkgLTAuMjYwNDYsMy4wOTIyNyAwLjAxNTEsNS4wMzkxNCAwLjE4ODIyLDEuMzI5ODUgMC42Mjk2OCwzLjI2MzA4IDAuOTgxMDIsNC4yOTYwNSAwLjM1MTMzLDEuMDMyOTggMS4xMjQyNCwyLjY5NTI4IDEuNzE3NTcsMy42OTQgMC41OTMzMywwLjk5ODcxIDEuODcwMzksMi42NTUgMi44Mzc5MSwzLjY4MDYyIDAuOTY3NTMsMS4wMjU2MyAyLjQ2MDI4LDIuMzQwOTEgMy4zMTcyMywyLjkyMjg2IDAuODU2OTYsMC41ODE5NSAyLjQwNjA1LDEuNDQ1OTkgMy40NDI0MywxLjkyMDExIDEuMDM2MzksMC40NzQxMSAyLjcxNzc4MywxLjA3MTk4IDMuNzM2NDIzLDEuMzI4NiAxLjIwNzYyLDAuMzA0MjMgMi44MTg3OSwwLjQ2Mjc0IDQuNjMwMjEsMC40NTU1NCAxLjk0Mjk5LC0wLjAwOCAzLjM5ODU1LC0wLjE3NjE3IDQuODQyLC0wLjU2MDMzIDEuMTM1MTQsLTAuMzAyMSAyLjg4OTQsLTAuOTgzMDcgMy44OTgzOCwtMS41MTMyNyAxLjAwODk3LC0wLjUzMDIgMi42Mzk5NCwtMS42NDA0OCAzLjYyNDM4LC0yLjQ2NzI3IDEuMTQ5MTgsLTAuOTY1MTYgMi4zODE5MiwtMi4zNzc1OSAzLjQ0MzgxLC0zLjk0NTc5IDAuOTA5NjcsLTEuMzQzMzkgMS42NTM5MywtMi42MSAxLjY1MzkzLC0yLjgxNDY4IDAsLTAuMjA0NjkgLTAuNDE2NzEsLTAuNTIyODUgLTAuOTI2MDQsLTAuNzA3MDIgLTAuNTA5MzIsLTAuMTg0MTggLTAuOTI2MDQsLTAuNDI1NTcgLTAuOTI2MDQsLTAuNTM2NDQgMCwtMC4xMTA4NiAwLjc0NDE0LC0wLjcwMTY2IDEuNjUzNjUsLTEuMzEyODkgMC45MDk1LC0wLjYxMTIzIDIuMDgyNzcsLTEuNDQ1MzYgMi42MDcyNiwtMS44NTM2MiBsIDAuOTUzNjEsLTAuNzQyMyAwLjE2OTI4LDIuMTc0NDkgYyAwLjA5MzEsMS4xOTU5NyAwLjE2OTk5LDIuNzM2MDIgMC4xNzA4NywzLjQyMjM0IGwgMC4wMDIsMS4yNDc4NSAtMC45MzczNCwtMC41NTMwNSBjIC0wLjUxNTUzLC0wLjMwNDE3IC0wLjk3Mzk5LC0wLjUwODUxIC0xLjAxODc5LC0wLjQ1NDA5IC0wLjA0NDgsMC4wNTQ0IC0wLjQ2Mzc3LDAuODI1NzEgLTAuOTMxMDQsMS43MTM5OSAtMC40NjcyNiwwLjg4ODI4IC0xLjUyMTYyLDIuNDE0NjcgLTIuMzQzMDEsMy4zOTE5OSAtMC44MjEzOCwwLjk3NzMxIC0yLjIxMzAzLDIuMzE3OTUgLTMuMDkyNTYsMi45NzkxOSAtMC44Nzk1MiwwLjY2MTI0IC0yLjUwOTU1LDEuNjYwMDUgLTMuNjIyMjgsMi4yMTk1OSAtMS4xMTI3MiwwLjU1OTU0IC0yLjk1ODE5LDEuMjYzOTIgLTQuMTAxMDQsMS41NjUyOSAtMS4xNDI4NSwwLjMwMTM3IC0zLjE0OTQ2LDAuNjAxMjIgLTQuNDU5MTUsMC42NjYzMyAtMS40MjYzNSwwLjA3MDkgLTMuMTQwNzYsLTAuMDI2NiAtNC4yNzUyNSwtMC4yNDMyMyB6IG0gMy4zNDkyMSwtOC4wMzY4NCB2IC00LjQ4ODEgbCAwLjgyNjgyLC0wLjE2NTM2IGMgMC40NTQ3NSwtMC4wOTA5IDEuMjg4MTksLTAuMTY1MzcgMS44NTIwOCwtMC4xNjUzNyBoIDEuMDI1MjYgdiA0LjM0NDYxIGMgMCw0LjM0NDYgMCw0LjM0NDYgLTAuNzI3Niw0LjQ4Mzc1IC0wLjQwMDE4LDAuMDc2NSAtMS4yMzM2MiwwLjIxNTUyIC0xLjg1MjA5LDAuMzA4ODYgbCAtMS4xMjQ0NywwLjE2OTcxIHogbSAtMy45MjIwMSwzLjc5MTE1IGMgLTAuNzc0NjUsLTAuMTg3NDcgLTEuNTI0NjQsLTAuNDU3MDQgLTEuNjY2NjQzLC0wLjU5OTA0IC0wLjE0MiwtMC4xNDIgLTAuMjIyNTcsLTEuMDc5ODIgLTAuMTc5MDQsLTIuMDg0MDQgbCAwLjA3OTEsLTEuODI1ODUgaCAxLjkxODIzMyBjIDEuMDU1MDMsMCAxLjkxODIzLDAuMDg5MyAxLjkxODIzLDAuMTk4NDMgMCwwLjEwOTE0IDAsMS4yMTA0NyAwLDIuNDQ3NCAwLDEuNjM0NzggLTAuMDkwMywyLjI0MjgxIC0wLjMzMDczLDIuMjI2NDYgLTAuMTgxOSwtMC4wMTI0IC0wLjk2NDU0LC0wLjE3NTg5IC0xLjczOTE5LC0wLjM2MzM2IHogbSA5LjQ3ODI2LC02Ljc0MDA2IHYgLTYuMzY3ODMgaCAxLjg1MjA4IDEuODUyMDggdiA1LjU1MTc5IDUuNTUxNzkgbCAtMS4yNTY3NywwLjYzMTY1IGMgLTAuNjkxMjIsMC4zNDc0MSAtMS41MjQ2NiwwLjcxNDYzIC0xLjg1MjA4LDAuODE2MDQgLTAuNTk1MzEsMC4xODQzOSAtMC41OTUzMSwwLjE4NDM5IC0wLjU5NTMxLC02LjE4MzQ0IHogbSAtMTUuNzI3NTYzLDMuMTgxNjggYyAtMC4wODE2LC0wLjEzMjA0IDAuMzQ2MzIsLTEuMTE0MzEgMC45NTA5NCwtMi4xODI4MSAwLjYwNDYyLC0xLjA2ODUxIDEuNjEwNzEsLTIuNzA2MjEgMi4yMzU3NSwtMy42MzkzMyAwLjg3ODg3LC0xLjMxMjA3IDEuMDc5NDEsLTEuODAzMTUgMC44ODQ4MSwtMi4xNjY3NiAtMC4xNjkzMiwtMC4zMTYzOCAtMC4xNTI5NywtMC41MzExMyAwLjA1LC0wLjY1NjU3IDAuMTY4ODksLTAuMTA0MzcgMC41MTU5LDAuMDkyMyAwLjc4ODU4MywwLjQ0Njk3IDAuMjY3ODQsMC4zNDgzNSAwLjQ4OTYzLDAuNzk2MjQgMC40OTI4NywwLjk5NTMxIDAuMDAzLDAuMTk5MDcgLTAuMzIxNTQsMC43MzU5NiAtMC43MjE3MywxLjE5MzA5IC0wLjQwMDE4MywwLjQ1NzEzIC0xLjUwMTUxMywyLjA0NjEyIC0yLjQ0NzM5MywzLjUzMTA4IC0wLjk0NTg5LDEuNDg0OTcgLTEuODAyMDYsMi43MDQyNSAtMS45MDI2MiwyLjcwOTUxIC0wLjEwMDU1LDAuMDA1IC0wLjI0OTU5LC0wLjA5ODUgLTAuMzMxMTksLTAuMjMwNDkgeiBtIDkuMDkwNDUzLC0xMC4wMTI1MyBjIC0wLjQxNDE2LC0xLjA2ODQ1IC0wLjU4NzEzLC0yLjA3MjcyIC0wLjU4MTA1LC0zLjM3MzQ0IDAuMDA2LC0xLjIzNjk3IDAuMTk2ODEsLTIuMzQ0NDIgMC41NzUxNCwtMy4zMzQ0OSAwLjMxMTU2LC0wLjgxNTMyIDAuOTc2MjQsLTEuOTQ2NDIgMS40NzcwNiwtMi41MTM1NCAwLjUwMDgzLC0wLjU2NzEzIDAuOTE1NTUsLTAuODk3MTIgMC45MjE2MSwtMC43MzMzMyAwLjAwNiwwLjE2Mzc5IC0wLjI3MTEzLDAuOTM3NyAtMC42MTU5OCwxLjcxOTc5IC0wLjM0NDg0LDAuNzgyMDkgLTAuNzYxNTYsMi4wNTI5MiAtMC45MjYwNCwyLjgyNDA3IC0wLjE2NDQ4LDAuNzcxMTUgLTAuMjk5MDUsMS44MDMyMSAtMC4yOTkwNSwyLjI5MzQ3IDAsMC40OTAyNSAwLjA2OTcsMS4wNzMwOCAwLjE1NDk0LDEuMjk1MTYgMC4xMTE0MiwwLjI5MDM1IDAuNTAxNjIsLTAuMDUzOCAxLjM4OTA3LC0xLjIyNTEzIDAuNjc4NzYsLTAuODk1ODkgMS43MTAzNiwtMS45NTUxNSAyLjI5MjQ1LC0yLjM1MzkgMC41ODIwOCwtMC4zOTg3NiAxLjU1MDM3LC0wLjgwMTY0IDIuMTUxNzQsLTAuODk1MjkgMC42MDEzOCwtMC4wOTM3IDEuMzE1NzYsLTAuMTE5MzUgMS41ODc1LC0wLjA1NzEgMC4zMzY4MiwwLjA3NzIgLTAuMTM3NTYsMC40MTE1NyAtMS40OTAyOCwxLjA1MDU2IC0xLjEwODAxLDAuNTIzMzggLTIuNDE1MTQsMS4zOTAxOCAtMi45NTk3NywxLjk2MjcgLTAuNTM2NDYsMC41NjM5NSAtMS4zNDAxMywxLjcyMjA1IC0xLjc4NTkzLDIuNTczNTcgLTAuNDQ1ODEsMC44NTE1MyAtMC44MTA1NSwxLjcxNDczIC0wLjgxMDU1LDEuOTE4MjMgMCwwLjIwMzUxIC0wLjExMDUxLDAuMzcwMDEgLTAuMjQ1NTgsMC4zNzAwMSAtMC4xMzUwNiwwIC0wLjUxMDk0LC0wLjY4NDYxIC0wLjgzNTI4LC0xLjUyMTM1IHogbSAtMTUuOTMyNTkzLC0xLjMwNDY0IGMgLTAuMDk1MywtMC4xNTQyNyAxMGUtNCwtMC45NTE1OCAwLjIxNTA3LC0xLjc3MTc5IDAuMjEzNjQsLTAuODIwMjEgMC43NjE0LC0yLjIzNDYxIDEuMjE3MjQsLTMuMTQzMTEgMC40NTU4NCwtMC45MDg1IDEuNDg1ODcsLTIuNjYzODUgMi4yODg5NiwtMy45MDA3OCAwLjgwMzEsLTEuMjM2OTIgMi4xODc1OSwtMy4xNDE5MiAzLjA3NjY1LC00LjIzMzMzIDAuODg5MDYsLTEuMDkxNCAyLjQ4MDEyLC0yLjg5MTAyIDMuNTM1NjksLTMuOTk5MTMgbCAxLjkxOTIyMywtMi4wMTQ3NiAtMC41MTY5MSwtMS4xNjg1NiBjIC0wLjI4NDMwMywtMC42NDI3IC0wLjgzMTQ0MywtMi4yNjUwNyAtMS4yMTU4NzMsLTMuNjA1MjcgLTAuNjk4OTcsLTIuNDM2NzIgLTAuNjk4OTcsLTIuNDM2NzIgLTAuMzAwOTEsLTYuMDc3MSAwLjM5ODA2LC0zLjY0MDM5IDAuMzk4MDYsLTMuNjQwMzkgLTAuMjQwMjgsLTQuNzQ1ODMgLTAuMzUxMDgsLTAuNjA4IC0wLjYzODMzLC0xLjE4NjI4IC0wLjYzODMzLC0xLjI4NTA4IDAsLTAuMDk4OCAwLjE4NjM4LC0wLjEwODExIDAuNDE0MTgsLTAuMDIwNyAwLjMwMjY4LDAuMTE2MTUgMC4zNzY1NSwwLjAzNDggMC4yNzQ0MSwtMC4zMDI0MiAtMC4wNzY5LC0wLjI1Mzc1IC0wLjI1NjU1LC0wLjk5MzkxIC0wLjM5OTMsLTEuNjQ0ODEgLTAuMTQyNzUsLTAuNjUwODkgLTAuMjA2NywtMS4yMzYyOSAtMC4xNDIxMiwtMS4zMDA4NiAwLjA2NDYsLTAuMDY0NiAwLjE1NDY1LC0wLjA2NzggMC4yMDAxNywtMC4wMDcgMC4wNDU1LDAuMDYwNiAwLjY2MTYyLDEuMDUyNzYgMS4zNjkxMSwyLjIwNDcyIDAuNzA3NDkzLDEuMTUxOTYgMS44OTA2NDMsMi44OTQ5IDIuNjI5MjIzLDMuODczMiAwLjczODU4LDAuOTc4MjkgMi42OTgwOSwzLjI4MDIzIDQuMzU0NDcsNS4xMTU0MSAxLjY1NjM4LDEuODM1MTkgMy4xNTM1OSwzLjMzNjcxIDMuMzI3MTQsMy4zMzY3MSAwLjE3MzU1LDAgMS40OTcyNCwwLjYzMzk3IDIuOTQxNTMsMS40MDg4MyAxLjQ0NDI5LDAuNzc0ODYgMy4xNjE3NiwxLjc0Mjk4IDMuODE2NjEsMi4xNTEzOCAwLjY1NDg0LDAuNDA4NCAxLjY4NTg3LDEuMTQyNzkgMi4yOTExOCwxLjYzMTk5IDAuNjA1MzEsMC40ODkxOSAxLjUyNzcyLDEuNDcxMzUgMi4wNDk4LDIuMTgyNTYgMC44NjQ3MSwxLjE3Nzk4IDAuOTM0MzIsMS40MDE5NyAwLjc4MTcsMi41MTU0MyAtMC4xMDYxLDAuNzc0MDkgLTAuMjk5ODgsMS4yMjIzMSAtMC41Mjg0NCwxLjIyMjMxIC0wLjI1NTUxLDAgLTAuMzYwOTIsLTAuMzc2OTkgLTAuMzYwOTIsLTEuMjkwODcgMCwtMS4yNTI5NyAtMC4wNTI4LC0xLjM0MDM2IC0xLjc5OTI5LC0yLjk3NjU3IC0xLjE0ODQyLC0xLjA3NTkxIC0yLjk0OSwtMi4zMzE3MyAtNC45Nzc1NiwtMy40NzE2MyAtMS43NDgwNSwtMC45ODIyNiAtMy4yNTEzNiwtMS43ODU5MyAtMy4zNDA2OCwtMS43ODU5MyAtMC4wODkzLDAgLTAuMjAwOTEsMC4xOTk4MiAtMC4yNDc5NiwwLjQ0NDA1IC0wLjA1OSwwLjMwNjQ0IC0wLjk0NzEzLC0wLjQ5MzA2IC0yLjg2NTU1LC0yLjU3OTY4IC0xLjUyOTAxLC0xLjY2MzA2IC0zLjc5MTE5LC00LjE5MDUgLTUuMDI3MDgsLTUuNjE2NTIgbCAtMi4yNDcwOCwtMi41OTI3NyAtMC4yNTIyOSwxLjQwMjE0IGMgLTAuMTM4NzYzLDAuNzcxMTggLTAuMjUyMTkzLDIuODkwNDMgLTAuMjUyMDYzLDQuNzA5NDQgMmUtNCwyLjkxMjM2IDAuMDgyNSwzLjUyODQ2IDAuNjg5MzMzLDUuMTU5MzggMC4zNzkwMSwxLjAxODY0IDAuODM3ODIsMi4yMTc0NiAxLjAxOTU4LDIuNjY0MDQgMC4zMjcxNSwwLjgwMzc5IDAuMzA3MjEsMC44MzYyNiAtMS45ODA5MDMsMy4yMjU4MyAtMS4yNzEyNiwxLjMyNzYyIC0yLjkxNjU0LDMuMTY0ODkgLTMuNjU2MTgsNC4wODI4MyAtMC43Mzk2NSwwLjkxNzkzIC0xLjk4ODgyLDIuNjUzNzUgLTIuNzc1OTQsMy44NTczNyAtMC43ODcxMiwxLjIwMzYyIC0yLjExNTM4LDMuNjM3MjEgLTIuOTUxNjksNS40MDc5OCAtMC44MzYzMSwxLjc3MDc3IC0xLjU5ODU4LDMuMDkzMzUgLTEuNjkzOTIsMi45MzkwOCB6IG0gMjkuMTg0MjczLC0xLjc3MjgxIGMgMCwtMC4yMTE5NSAwLjQ5NjU5LC0wLjQ5MDUgMS4xODIyMywtMC42NjMxNSAwLjY3MTg2LC0wLjE2OTE4IDEuMzAwMDcsLTAuNTE3ODkgMS40NTUyMSwtMC44MDc3NiAwLjE1MDE0LC0wLjI4MDU1IDAuMjcyOTgsLTAuNTg3OTEgMC4yNzI5OCwtMC42ODMwMyAwLC0wLjA5NTEgLTAuNDcxMjMsLTAuMDkzMyAtMS4wNDcxNywwLjAwNCAtMC41NzU5NSwwLjA5NzMgLTEuMjkwMzIsMC4wOTk4IC0xLjU4NzUsMC4wMDUgLTAuMjk3MTgsLTAuMDk0MyAtMC41NDAzMywtMC4yNjcwNCAtMC41NDAzMywtMC4zODM4MiAwLC0wLjExNjc5IDAuNzE5NCwtMC4zNTM4NyAxLjU5ODY3LC0wLjUyNjg1IDAuODc5MjYsLTAuMTcyOTkgMS45OTk3MywtMC41NTExNSAyLjQ4OTkxLC0wLjg0MDM3IDAuNDkwMTksLTAuMjg5MjIgMC45NjA5OSwtMC43MDc1OCAxLjA0NjIyLC0wLjkyOTcgMC4wODUyLC0wLjIyMjExIDAuMDQyOCwtMC42MTMzNyAtMC4wOTQyLC0wLjg2OTQ2IC0wLjEzNzA1LC0wLjI1NjA5IC0wLjQzNDI4LC0wLjYxOTIzIC0wLjY2MDUxLC0wLjgwNjk4IC0wLjIyNjIyLC0wLjE4Nzc1IC0wLjQxMTMyLC0wLjQzOSAtMC40MTEzMiwtMC41NTgzNCAwLC0wLjExOTMzIDAuNDc5MDEsLTAuMjUzNTggMS4wNjQ0NiwtMC4yOTgzMyBsIDEuMDY0NDYsLTAuMDgxNCAtMS4xOTM5NywtMS41ODc1IGMgLTAuNjU2NjgsLTAuODczMTMgLTEuMTk1MjIsLTEuNzM2MzMgLTEuMTk2NzUsLTEuOTE4MjMgLTAuMDAyLC0wLjE4MTkgMC4xMDM2NywtMC4zMzA3MyAwLjIzMzc4LC0wLjMzMDczIDAuMTMwMTEsMCAwLjkxMDQyLDAuODc5NzkgMS43MzQwMywxLjk1NTA4IDAuODIzNiwxLjA3NTI5IDEuNTEzOTksMi4xNzY2MiAxLjUzNDE4LDIuNDQ3NCAwLjAyMDIsMC4yNzA3NyAtMC40MDgyOCwxLjE4NzYxIC0wLjk1MjE3LDIuMDM3NDEgLTAuNjMyNTIsMC45ODgyNiAtMS4xMjAyNSwxLjQ5NDY5IC0xLjM1MzM1LDEuNDA1MjQgLTAuMjU5MDIsLTAuMDk5NCAtMC40MTc1NiwwLjE4MDc5IC0wLjU0OCwwLjk2ODQ1IC0wLjEwMDk0LDAuNjA5NTYgLTAuMjg1MywxLjMwMjM0IC0wLjQwOTY4LDEuNTM5NSAtMC4xMjQzNywwLjIzNzE2IC0wLjcwODI3LDAuNjI0MTIgLTEuMjk3NTQsMC44NTk5IC0wLjU4OTI3LDAuMjM1NzggLTEuMzY2NjUsMC40Mjg2OSAtMS43Mjc1MSwwLjQyODY5IC0wLjM4MTc1LDAgLTAuNjU2MTEsLTAuMTUyODIgLTAuNjU2MTEsLTAuMzY1NDcgeiBtIC0yLjQ4Mzg2LC0zLjU1NTI3IGMgLTAuMDg1OSwtMC4xMzg5NSAwLjAyLC0wLjM5ODgxIDAuMjM1MjUsLTAuNTc3NDYgMC4yMTUyNiwtMC4xNzg2NSAxLjE2NjQ1LC0wLjM4NzA0IDIuMTEzNzUsLTAuNDYzMDggMS4wNjI5MywtMC4wODUzIDEuNzIyMzYsLTAuMDM3MSAxLjcyMjM2LDAuMTI2MDYgMCwwLjE0NTM3IC0wLjY4NDYsMC4zODI4NCAtMS41MjEzNSwwLjUyNzcyIC0wLjgzNjc0LDAuMTQ0ODggLTEuNzE3NjcsMC4zNDgwMiAtMS45NTc2MSwwLjQ1MTQxIC0wLjIzOTk0LDAuMTAzNCAtMC41MDY1MiwwLjA3NDMgLTAuNTkyNCwtMC4wNjQ3IHogbSAtMS42NDI5NCwtMS42NzcyMSBjIC0wLjA3NywtMC4xMjQ2NCAwLjA3NTgsLTAuMzE1MDggMC4zMzk3MywtMC40MjMxOSAwLjI2Mzg4LC0wLjEwODExIDEuNTExNjYsLTAuMTk2NTcgMi43NzI4NCwtMC4xOTY1NyAxLjI2MTE4LDAgMi4zODIzNSwwLjA4OTMgMi40OTE0OSwwLjE5ODQ0IDAuMTA5MTQsMC4xMDkxNCAwLjE0ODgzLDAuMjQzMDkgMC4wODgyLDAuMjk3NjggLTAuMDYwNiwwLjA1NDYgLTEuMzM0NjksMC4xNTU3MiAtMi44MzEyMiwwLjIyNDc2IC0xLjQ5NjU0LDAuMDY5IC0yLjc4NDAxLDAuMDIzNSAtMi44NjEwNCwtMC4xMDExMiB6IG0gNC42NTU5NywtMS4wNjAzNSBjIC0wLjM2MzgsLTAuMTUxMTIgLTEuNjQyNzIsLTAuMjkyNCAtMi44NDIwNSwtMC4zMTM5NiAtMS4xOTkzMiwtMC4wMjE2IC0yLjE4MTU5LC0wLjEyNjIzIC0yLjE4MjgxLC0wLjIzMjYgLTAuMDAxLC0wLjEwNjM2IDAuMjk1NDQsLTAuMjU1MTkgMC42NTkyNCwtMC4zMzA3MyAwLjM2MzgsLTAuMDc1NSAwLjk1NTQsLTAuMTk4MiAxLjMxNDY3LC0wLjI3MjU5IDAuMzU5MjYsLTAuMDc0NCAxLjIyMjQ2LC0wLjAxMjggMS45MTgyMywwLjEzNjg5IDAuNjk1NzUsMC4xNDk2OCAxLjUzMjksMC40MDkyNiAxLjg2MDMzLDAuNTc2ODQgMC4zMjc0MiwwLjE2NzU5IDAuNTk1MzEsMC40MDM2NCAwLjU5NTMxLDAuNTI0NTcgMCwwLjEyMDkzIC0wLjE0ODgzLDAuMjEyMzMgLTAuMzMwNzMsMC4yMDMxMSAtMC4xODE5LC0wLjAwOSAtMC42MjgzOSwtMC4xNDA0MSAtMC45OTIxOSwtMC4yOTE1MyB6IG0gLTAuNTI5MTcsLTQuNDU0MiBjIC0wLjIxODI4LC0wLjE0MTA3IC0wLjcxNzA1LC0wLjI1ODMxIC0xLjEwODM4LC0wLjI2MDUzIC0wLjQzODcyLC0wLjAwMiAtMS4xNTM4LC0wLjM4Njg2IC0xLjg2NTE1LC0xLjAwMjUyIC0wLjYzNDUsLTAuNTQ5MTYgLTEuNjUzNzcsLTEuMTYzNTMgLTIuMjY1MDUsLTEuMzY1MjcgLTAuNjExMjgsLTAuMjAxNzQgLTEuMTExNDEsLTAuNDU4MDcgLTEuMTExNDEsLTAuNTY5NjMgMCwtMC4xMTE1NiAwLjIwODM2LC0wLjI0NjQyIDAuNDYzMDIsLTAuMjk5NjkgMC4yNTQ2NiwtMC4wNTMzIDEuNDcyODUsMC4wNjE0IDIuNzA3MDksMC4yNTQ4OSAxLjIzNDI0LDAuMTkzNDYgMi41MTQxNiwwLjUyODcyIDIuODQ0MjcsMC43NDUwMSAwLjM2MzQsMC4yMzgxMSAwLjYwMDIsMC42NTg2OSAwLjYwMDIsMS4wNjYwMiAwLDAuMzcwMDIgMC4xMjMyNSwwLjkwMzA1IDAuMjczODksMS4xODQ1MyAwLjE1MDY0LDAuMjgxNDcgMC4xODA0MSwwLjUwOTk1IDAuMDY2MiwwLjUwNzcyIC0wLjExNDI2LC0wLjAwMiAtMC4zODYzNCwtMC4xMTk0NyAtMC42MDQ2MywtMC4yNjA1MyB6IG0gLTEuMzIyOTEsLTEuNTcxODkgYyAwLC0wLjEzNjkzIC0wLjEyNjk4LC0wLjMyNzQ1IC0wLjI4MjE4LC0wLjQyMzM3IC0wLjE1NTIxLC0wLjA5NTkgLTAuMzQ1NzIsLTAuMTEwODYgLTAuNDIzMzcsLTAuMDMzMiAtMC4wNzc3LDAuMDc3NyAtMC4wNjI3LDAuMjY4MTYgMC4wMzMyLDAuNDIzMzcgMC4wOTU5LDAuMTU1MiAwLjI4NjQzLDAuMjgyMTggMC40MjMzNywwLjI4MjE4IDAuMTM2OTMsMCAwLjI0ODk2LC0wLjExMjAzIDAuMjQ4OTYsLTAuMjQ4OTcgeiBtIC0xMi41MTQ5LC02LjE3NDggYyAtMC42ODg0LC0wLjM5MzQyIC0xLjE4OTI4LC0wLjk3OTg2IC0xLjYyMzc5LC0xLjkwMTIxIC0wLjQwMDA3LC0wLjg0ODI5IC0wLjY4MDAyLC0yLjAzMTUzIC0wLjc3MDU5LC0zLjI1Njk3IC0wLjA3ODIsLTEuMDU4NTcgLTAuMDQ4OCwtMS44NjY4OCAwLjA2NTUsLTEuNzk2MjYgMC4xMTQyNywwLjA3MDYgMC42NjQzNywxLjIzNDM4IDEuMjIyNDUsMi41ODYxMiAwLjU1ODA3LDEuMzUxNzUgMS4zMDA4OSwyLjk3NDAxIDEuNjUwNzEsMy42MDUwNCAwLjM0OTgyLDAuNjMxMDMgMC41OTQ0NCwxLjE4ODkyIDAuNTQzNiwxLjIzOTc1IC0wLjA1MDgsMC4wNTA4IC0wLjU0MDM5LC0wLjE2MzU3IC0xLjA4Nzg5LC0wLjQ3NjQ3IHogbSA5LjMxNDMyLC00LjAyNTA2IGMgLTAuNDIwNTIsLTAuMjI4NiAtMS4zMzYwOSwtMS41MDc0MyAtMi4zNjAyMiwtMy4yOTY3IC0wLjkyMDI2LC0xLjYwNzc3IC0xLjc2MTQ5LC0yLjkyMzIyIC0xLjg2OTQsLTIuOTIzMjIgLTAuMTA3OTEsMCAtMC4yNzY1NiwwLjQ3NTYzIC0wLjM3NDc3LDEuMDU2OTUgLTAuMDk4MiwwLjU4MTMyIC0wLjI3Mzc4LDEuMTE1NzkgLTAuMzkwMTUsMS4xODc3MSAtMC4xMTYzNywwLjA3MTkgLTAuMzM3NCwtMC4wMjA4IC0wLjQ5MTE2LC0wLjIwNjEgLTAuMTgzNDEsLTAuMjIxIC0wLjE5ODYzLC0wLjY5NTc3IC0wLjA0NDMsLTEuMzgwMjYgMC4xODYyNywtMC44MjU5MSAwLjEyODU5LC0xLjI4NDY4IC0wLjI3NjczLC0yLjIwMDk4IC0wLjQzOTM5LC0wLjk5MzMgLTAuNDUyNDIsLTEuMTM0NyAtMC4wOTE4LC0wLjk5NjM0IDAuMzY3MDIsMC4xNDA4NSAwLjM5Njg3LC0wLjAzOTkgMC4yMzU3NiwtMS40Mjc5OCAtMC4xMDE0NCwtMC44NzQwOSAtMC4xMTQ4MSwtMS41ODkyNSAtMC4wMjk3LC0xLjU4OTI1IDAuMDg1MSwwIDAuNzg5ODksMS4yNzk5MiAxLjU2NjE3LDIuODQ0MjcgMC43NzYyNywxLjU2NDM1IDIuMjYyNzgsNC4zMDI3OSAzLjMwMzM2LDYuMDg1NDIgMS4wNDA1OCwxLjc4MjYzIDEuODA2MDEsMy4yMzYzOCAxLjcwMDk2LDMuMjMwNTUgLTAuMTA1MDUsLTAuMDA2IC0wLjUwMDE2LC0wLjE3ODY2IC0wLjg3ODAzLC0wLjM4NDA3IHoiCiAgICAgICBpZD0icGF0aDE1NyIgLz4KICA8L2c+Cjwvc3ZnPgo=";
export const LynxLogo = ({ s=20, style={} }) => (
  <img src={LYNX_ICON} alt="" width={s} height={s} style={{ display:"inline-block", verticalAlign:"middle", ...style }} />
);



// ─── Icon system ─────────────────────────────────────────────────────────────
export const Ic = ({ n, s=20, c="#fff", style={} }) => {
  const p = { fill:"none", stroke:c, strokeWidth:1.7, strokeLinecap:"round", strokeLinejoin:"round" };
  const map = {
    home:        <><path d="M3 12l9-9 9 9"{...p}/><path d="M5 10v10h4v-6h6v6h4V10"{...p}/></>,
    list:        <><line x1="8" y1="6" x2="21" y2="6"{...p}/><line x1="8" y1="12" x2="21" y2="12"{...p}/><line x1="8" y1="18" x2="21" y2="18"{...p}/><circle cx="3" cy="6"  r="1" fill={c} stroke="none"/><circle cx="3" cy="12" r="1" fill={c} stroke="none"/><circle cx="3" cy="18" r="1" fill={c} stroke="none"/></>,
    bar:         <><path d="M18 20V10M12 20V4M6 20v-6"{...p}/></>,
    gear:        <><circle cx="12" cy="12" r="3"{...p}/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"{...p}/></>,
    plus:        <><line x1="12" y1="5" x2="12" y2="19"{...p}/><line x1="5" y1="12" x2="19" y2="12"{...p}/></>,
    check:       <><polyline points="20 6 9 17 4 12"{...p}/></>,
    x:           <><line x1="18" y1="6" x2="6" y2="18"{...p}/><line x1="6" y1="6" x2="18" y2="18"{...p}/></>,
    edit:        <><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"{...p}/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"{...p}/></>,
    trash:       <><polyline points="3 6 5 6 21 6"{...p}/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"{...p}/></>,
    search:      <><circle cx="11" cy="11" r="8"{...p}/><line x1="21" y1="21" x2="16.65" y2="16.65"{...p}/></>,
    arrow_l:     <><line x1="19" y1="12" x2="5" y2="12"{...p}/><polyline points="12 19 5 12 12 5"{...p}/></>,
    chevron:     <><polyline points="6 9 12 15 18 9"{...p}/></>,
    chevron_up:  <><polyline points="18 15 12 9 6 15"{...p}/></>,
    chevron_down:<><polyline points="6 9 12 15 18 9"{...p}/></>,
    wallet:      <><rect x="2" y="5" width="20" height="14" rx="2"{...p}/><path d="M2 10h20"{...p}/><circle cx="16" cy="15" r="1" fill={c} stroke="none"/></>,
    up:          <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"{...p}/><polyline points="17 6 23 6 23 12"{...p}/></>,
    down:        <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"{...p}/><polyline points="17 18 23 18 23 12"{...p}/></>,
    coins:       <><circle cx="8" cy="8" r="6"{...p}/><path d="M18.09 10.37A6 6 0 1110.34 18"{...p}/><path d="M7 6h1v4"{...p}/><line x1="16.71" y1="13.88" x2="17.71" y2="13.88"{...p}/></>,
    tag:         <><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"{...p}/><line x1="7" y1="7" x2="7.01" y2="7"{...p}/></>,
    cal:         <><rect x="3" y="4" width="18" height="18" rx="2"{...p}/><line x1="16" y1="2" x2="16" y2="6"{...p}/><line x1="8" y1="2" x2="8" y2="6"{...p}/><line x1="3" y1="10" x2="21" y2="10"/></>,
    user:        <><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"{...p}/><circle cx="12" cy="7" r="4"{...p}/></>,
    phone:       <><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 01.22 4.18 2 2 0 012.18 2H5.18a2 2 0 012 1.72c.13.96.36 1.9.63 2.94a2 2 0 01-.45 2.11L6.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c1.04.27 1.98.5 2.94.63A2 2 0 0122 16.92z"{...p}/></>,
    mail:        <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"{...p}/><polyline points="22,6 12,13 2,6"{...p}/></>,
    dl:          <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"{...p}/><polyline points="7 10 12 15 17 10"{...p}/><line x1="12" y1="15" x2="12" y2="3"{...p}/></>,
    ul:          <><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"{...p}/><polyline points="17 8 12 3 7 8"{...p}/><line x1="12" y1="3" x2="12" y2="15"{...p}/></>,
    share:       <><circle cx="18" cy="5" r="3"{...p}/><circle cx="6" cy="12" r="3"{...p}/><circle cx="18" cy="19" r="3"{...p}/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"{...p}/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"{...p}/></>,
    copy:        <><rect x="9" y="9" width="13" height="13" rx="2"{...p}/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"{...p}/></>,
    sun:         <><circle cx="12" cy="12" r="5"{...p}/><line x1="12" y1="1" x2="12" y2="3"{...p}/><line x1="12" y1="21" x2="12" y2="23"{...p}/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"{...p}/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"{...p}/><line x1="1" y1="12" x2="3" y2="12"{...p}/><line x1="21" y1="12" x2="23" y2="12"{...p}/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"{...p}/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"{...p}/></>,
    moon:        <><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"{...p}/></>,
    auto:        <><circle cx="12" cy="12" r="9"{...p}/><path d="M12 3v9l4 2"{...p}/></>,
    alert:       <><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"{...p}/><line x1="12" y1="9" x2="12" y2="13"{...p}/><line x1="12" y1="17" x2="12.01" y2="17"{...p}/></>,
    pin:         <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"{...p}/><circle cx="12" cy="10" r="3"{...p}/></>,
    card:        <><rect x="1" y="4" width="22" height="16" rx="2"{...p}/><line x1="1" y1="10" x2="23" y2="10"{...p}/></>,
    info:        <><circle cx="12" cy="12" r="10"{...p}/><line x1="12" y1="8" x2="12" y2="12"{...p}/><line x1="12" y1="16" x2="12.01" y2="16"{...p}/></>,
    lock:        <><rect x="3" y="11" width="18" height="11" rx="2"{...p}/><path d="M7 11V7a5 5 0 0110 0v4"{...p}/></>,
    unlock:      <><rect x="3" y="11" width="18" height="11" rx="2"{...p}/><path d="M7 11V7a5 5 0 019.9-1"{...p}/></>,
    finger:      <><path d="M2 12C2 6.48 6.48 2 12 2s10 4.48 10 10"{...p}/><path d="M5 12c0-3.87 3.13-7 7-7s7 3.13 7 7"{...p}/><path d="M8 12c0-2.21 1.79-4 4-4s4 1.79 4 4"{...p}/><path d="M11 12c0-.55.45-1 1-1s1 .45 1 1v4"{...p}/></>,
    shield:      <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"{...p}/></>,
    repeat:      <><polyline points="17 1 21 5 17 9"{...p}/><path d="M3 11V9a4 4 0 014-4h14"{...p}/><polyline points="7 23 3 19 7 15"{...p}/><path d="M21 13v2a4 4 0 01-4 4H3"{...p}/></>,
    clipboard:   <><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 01-2-2V6a2 2 0 012-2h2"{...p}/><rect x="8" y="2" width="8" height="4" rx="1"{...p}/></>,
    dots:        <><circle cx="12" cy="5" r="2" fill={c} stroke="none"/><circle cx="12" cy="12" r="2" fill={c} stroke="none"/><circle cx="12" cy="19" r="2" fill={c} stroke="none"/></>,
    zap:         <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"{...p}/></>
  };
  return <svg viewBox="0 0 24 24" style={{ width:s, height:s, flexShrink:0, ...style }}>{map[n] ?? null}</svg>;
};

// ─── Pill (filter buttons) ────────────────────────────────────────────────────
export const Pill = ({ label, active, color, inactiveColor, onClick }) => (
  <button onClick={onClick} style={{
    padding:"6px 14px", borderRadius:20, cursor:"pointer",
    border:`1.5px solid ${active ? color : "transparent"}`,
    background: active ? `${color}20` : "transparent",
    color: active ? color : (inactiveColor || "#64748B"),
    fontSize:12, fontWeight: active ? 600 : 400,
    whiteSpace:"nowrap", flexShrink:0, transition:"all .2s",
  }}>{label}</button>
);

// ─── StickyHeader ─────────────────────────────────────────────────────────────
export const StickyHeader = ({ C, icon, title, right }) => (
  <div className="hdr" style={{
    position:"sticky", top:0, zIndex:50,
    background:C.bg, paddingBottom:10,
    paddingLeft:16, paddingRight:16,
    borderBottom:`1px solid ${C.border}`,
  }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <h2 style={{ fontSize:18, fontWeight:700, display:"flex", alignItems:"center", gap:8, color:C.text }}>
        <Ic n={icon} s={18} c={C.accent}/>{title}
      </h2>
      {right ?? null}
    </div>
  </div>
);

// ─── QuickAddModal ────────────────────────────────────────────────────────────
export function QuickAddModal({ C, t, onClose, onSave }) {
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const fld = { width:"100%", height:46, padding:"0 12px", background:C.cardAlt, border:`1.5px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:14 };

  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="su" style={{background:C.card,borderRadius:18,width:"100%",maxWidth:340,padding:20,border:`1px solid ${C.border}`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.text,display:"flex",alignItems:"center",gap:6}}><Ic n="zap" s={18} c={C.warning}/> {t("Brzi unos")}</h3>
          <button onClick={onClose} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="x" s={14} c={C.textMuted}/></button>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:.5}}>{t("Iznos (€)")}</label>
          <input type="number" step="0.01" autoFocus placeholder="0,00" value={amount} onChange={e=>setAmount(e.target.value)} style={{...fld,fontFamily:"'JetBrains Mono',monospace",fontWeight:700,fontSize:18,color:C.warning}}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:6,display:"block",textTransform:"uppercase",letterSpacing:.5}}>{t("Opis / Kratko")}</label>
          <input type="text" placeholder={t("Npr. Stanarina")} value={desc} onChange={e=>setDesc(e.target.value)} style={fld}/>
        </div>
        <button onClick={()=>{ if(amount&&desc){onSave({amount,desc});} }} style={{width:"100%",padding:14,background:`linear-gradient(135deg,${C.warning},#F59E0B)`,border:"none",borderRadius:14,color:"#000",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <Ic n="check" s={16} c="#000"/>{t("Spremi skicu")}
        </button>
      </div>
    </div>
  );
}

// ─── ActionHubModal ───────────────────────────────────────────────────────────
export function ActionHubModal({ C, t, drafts, onClose, onNew, onSelect, onDel }) {
  return (
    <div className="fi" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="su" style={{background:C.bg,borderRadius:20,width:"100%",maxWidth:360,padding:"20px 16px",border:`1px solid ${C.border}`,boxShadow:`0 10px 40px rgba(0,0,0,0.3)`}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h3 style={{fontSize:16,fontWeight:700,color:C.text}}>{t("Što želite dodati?")}</h3>
          <button onClick={onClose} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="x" s={14} c={C.textMuted}/></button>
        </div>
        <button onClick={onNew} style={{width:"100%",padding:16,background:`linear-gradient(135deg,${C.accent},${C.accentDk})`,border:"none",borderRadius:14,color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:20}}>
          <Ic n="plus" s={18} c="#fff"/> {t("Novi puni unos")}
        </button>
        {drafts.length > 0 && (
          <div>
            <div style={{fontSize:11,fontWeight:600,color:C.textMuted,marginBottom:10,textTransform:"uppercase",letterSpacing:.5,display:"flex",alignItems:"center",gap:6}}>
              <Ic n="zap" s={13} c={C.warning}/> {t("Nedovršene skice")} ({drafts.length})
            </div>
            <div style={{maxHeight:250,overflowY:"auto"}}>
              {drafts.map(d => (
                <div key={d.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:12,background:C.card,border:`1px solid ${C.border}`,borderRadius:12,marginBottom:8}}>
                   <div style={{display:"flex",flexDirection:"column",flex:1,cursor:"pointer",textAlign:"left"}} onClick={()=>onSelect(d)}>
                     <span style={{fontSize:14,fontWeight:600,color:C.text}}>{d.description}</span>
                     <span style={{fontSize:11,color:C.textMuted}}>{fDate(d.date)} · {t("Brzi unos")}</span>
                   </div>
                   <div style={{display:"flex",alignItems:"center",gap:10}}>
                     <span style={{fontSize:15,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",color:C.warning}}>{fmtEur(d.amount)}</span>
                     <button onClick={()=>onDel(d.id)} style={{background:C.cardAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:6,cursor:"pointer"}}><Ic n="trash" s={14} c={C.expense}/></button>
                   </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
