import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const SHOOTHILL_LOGO_URI =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMTMzLjA3MiIgdmlld0JveD0iMCAwIDUwMCAxMzMuMDcyIj48ZyBpZD0iR3JvdXBfMTAyMTEiIGRhdGEtbmFtZT0iR3JvdXAgMTAyMTEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02MjIgLTc3Ny43NTIpIj48ZyBpZD0iR3JvdXBfOTkzMiIgZGF0YS1uYW1lPSJHcm91cCA5OTMyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2MjIgNzc3Ljc1MikiPjxwYXRoIGlkPSJQYXRoXzE1NDQ4IiBkYXRhLW5hbWU9IlBhdGggMTU0NDgiIGQ9Ik00MC40NjgsMjAuNDE2QTM4LjY5LDM4LjY5LDAsMCwxLDczLjM2LDUzLjE1YS41NjUuNTY1LDAsMCwwLC41Ni40ODVoOS4yNThhLjU2NC41NjQsMCwwLDAsLjU2Mi0uNjMsNDkuMTYzLDQ5LjE2MywwLDAsMC00My4xMzMtNDIuOTcuNTY2LjU2NiwwLDAsMC0uNjI4LjU2MnY5LjI1OGEuNTY3LjU2NywwLDAsMCwuNDg5LjU2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMS41ODUgNy45MjYpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NDkiIGRhdGEtbmFtZT0iUGF0aCAxNTQ0OSIgZD0iTTUzLjMxNCwxMC4wMzZBNDkuMTcsNDkuMTcsMCwwLDAsMTAuMTgsNTMuMDA2YS41NjkuNTY5LDAsMCwwLC41NjQuNjMySDIwYS41NjUuNTY1LDAsMCwwLC41Ni0uNDg3QTM4LjY5MiwzOC42OTIsMCwwLDEsNTMuNDU0LDIwLjQxNmEuNTY1LjU2NSwwLDAsMCwuNDg5LS41NlYxMC42YS41NjYuNTY2LDAsMCwwLS42MjgtLjU2NCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOC4wNCA3LjkyNSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MCIgZGF0YS1uYW1lPSJQYXRoIDE1NDUwIiBkPSJNODMuNjQ1LDM5LjkzMmEuNTY2LjU2NiwwLDAsMC0uNDIxLS4xODhINzMuOTY3YS41NjYuNTY2LDAsMCwwLS41NjIuNDkyLDM4LjYyNywzOC42MjcsMCwwLDEtMzIuOTM3LDMzLjEuNTY1LjU2NSwwLDAsMC0uNDg5LjU2djkuMjU2YS41NjcuNTY3LDAsMCwwLC4xODguNDIyLjU3My41NzMsMCwwLDAsLjM3OC4xNDVjLjAyMSwwLC4wNDEsMCwuMDYzLDBBNDkuMTA1LDQ5LjEwNSwwLDAsMCw4My43ODcsNDAuMzcxYS41NjQuNTY0LDAsMCwwLS4xNDEtLjQzOSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEuNTg1IDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MSIgZGF0YS1uYW1lPSJQYXRoIDE1NDUxIiBkPSJNNTMuNDczLDczLjMzMWEzOC42MjUsMzguNjI1LDAsMCwxLTMyLjkzOS0zMy4xLjU2Ny41NjcsMCwwLDAtLjU2Mi0uNDkySDEwLjcxOGEuNTY2LjU2NiwwLDAsMC0uNTY0LjYyN0E0OS4xLDQ5LjEsMCwwLDAsNTMuMzM0LDgzLjcxMmMuMDIxLDAsLjA0MSwwLC4wNjMsMGEuNTY2LjU2NiwwLDAsMCwuNTY2LS41NjZWNzMuODkyYS41NjcuNTY3LDAsMCwwLS40ODktLjU2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4LjAyIDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MiIgZGF0YS1uYW1lPSJQYXRoIDE1NDUyIiBkPSJNNDAuNTQ1LDU3LjA1MmEuNTg4LjU4OCwwLDAsMCwuMTM2LS4wMTZBMjIuNjg0LDIyLjY4NCwwLDAsMCw1Ny4yNjksNDAuNDQ3YS41NjguNTY4LDAsMCwwLS41NS0uN2gtOC4wMWEuNTY3LjU2NywwLDAsMC0uNTI2LjM1OCwxNC4wNzQsMTQuMDc0LDAsMCwxLTcuODQ4LDcuODQ4LjU2Ni41NjYsMCwwLDAtLjM1Ni41MjZ2OC4wMWEuNTY0LjU2NCwwLDAsMCwuNTY2LjU2NiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEuNTg1IDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MyIgZGF0YS1uYW1lPSJQYXRoIDE1NDUzIiBkPSJNNDAuMzM2LDMzLjgyNGExNC4wNzksMTQuMDc5LDAsMCwxLDcuODQ4LDcuODQ4LjU2NS41NjUsMCwwLDAsLjUyNi4zNThoOC4wMWEuNTY3LjU2NywwLDAsMCwuNTUtLjcsMjIuNjg0LDIyLjY4NCwwLDAsMC0xNi41ODgtMTYuNTkuNTc5LjU3OSwwLDAsMC0uNDg1LjEwNi41NjYuNTY2LDAsMCwwLS4yMTguNDQ2VjMzLjNhLjU2OC41NjgsMCwwLDAsLjM1OC41MjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMxLjU4NCAxOS41MzIpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NTQiIGRhdGEtbmFtZT0iUGF0aCAxNTQ1NCIgZD0iTTQxLjkwOCw0Ny45NDlBMTQuMDY5LDE0LjA2OSwwLDAsMSwzNC4wNjEsNDAuMWEuNTcyLjU3MiwwLDAsMC0uNTI4LS4zNThIMjUuNTI0YS41NjguNTY4LDAsMCwwLS41NS43QTIyLjY3OSwyMi42NzksMCwwLDAsNDEuNTYzLDU3LjAzNWEuNTg3LjU4NywwLDAsMCwuMTM2LjAxNi41NjcuNTY3LDAsMCwwLC41NjctLjU2NnYtOC4wMWEuNTY4LjU2OCwwLDAsMC0uMzU4LS41MjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE5LjcxNyAzMS4zOTkpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NTUiIGRhdGEtbmFtZT0iUGF0aCAxNTQ1NSIgZD0iTTQxLjU2MywyNC43NEEyMi42NzYsMjIuNjc2LDAsMCwwLDI0Ljk3NSw0MS4zMjhhLjU2OC41NjgsMCwwLDAsLjU1LjdoOC4wMDlhLjU2NS41NjUsMCwwLDAsLjUyNi0uMzU4LDE0LjA3MiwxNC4wNzIsMCwwLDEsNy44NDktNy44NDguNTcyLjU3MiwwLDAsMCwuMzU4LS41MjhWMjUuMjg5YS41NjguNTY4LDAsMCwwLS43LS41NSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTkuNzE3IDE5LjUzMikiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1NiIgZGF0YS1uYW1lPSJQYXRoIDE1NDU2IiBkPSJNNDAuMzM0LDY2LjY2SDM2LjNhLjI3OC4yNzgsMCwwLDAtLjI3Ny4yNzdWNzguMTEzYTIuMywyLjMsMCwwLDAsNC41OTEsMFY2Ni45MzdhLjI3OS4yNzksMCwwLDAtLjI3Ny0uMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyOC40NTcgNTIuNjY0KSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU3IiBkYXRhLW5hbWU9IlBhdGggMTU0NTciIGQ9Ik0xMy43NDgsNDAuMlYzNi4xNjVhLjI3OC4yNzgsMCwwLDAtLjI3Ny0uMjc3SDIuMjk1YTIuMywyLjMsMCwwLDAsMCw0LjU5MUgxMy40N2EuMjc5LjI3OSwwLDAsMCwuMjc3LS4yNzciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjguMzUzKSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU4IiBkYXRhLW5hbWU9IlBhdGggMTU0NTgiIGQ9Ik02Ni42Niw0MC4yVjM2LjE2NWEuMjc4LjI3OCwwLDAsMSwuMjc3LS4yNzdINzguMTEzYTIuMywyLjMsMCwwLDEsMCw0LjU5MUg2Ni45MzdhLjI3OS4yNzksMCwwLDEtLjI3Ny0uMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1Mi42NjQgMjguMzUzKSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU5IiBkYXRhLW5hbWU9IlBhdGggMTU0NTkiIGQ9Ik0zNi4zLDEzLjc0OGg0LjAzN2EuMjc4LjI3OCwwLDAsMCwuMjc3LS4yNzdWMi4yOTVhMi4zLDIuMywwLDAsMC00LjU5MSwwVjEzLjQ3YS4yNzkuMjc5LDAsMCwwLC4yNzcuMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyOC40NTcpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PC9nPjxnIGlkPSJHcm91cF85OTMzIiBkYXRhLW5hbWU9Ikdyb3VwIDk5MzMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc3OC45NjEgODExLjA2OCkiPjxnIGlkPSJHcm91cF85OTM1IiBkYXRhLW5hbWU9Ikdyb3VwIDk5MzUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMS4xMDMpIj48cGF0aCBpZD0iUGF0aF8xNTQ2MCIgZGF0YS1uYW1lPSJQYXRoIDE1NDYwIiBkPSJNMTI0LjEzMSwzOC4yNThhNy44MDYsNy44MDYsMCwwLDAtMy4xNzctNS44LDEyLjYsMTIuNiwwLDAsMC03LjYxNy0yLjA2NiwxNC43NzQsMTQuNzc0LDAsMCwwLTUuNTIyLjkwOSw3Ljc1NSw3Ljc1NSwwLDAsMC0zLjQzNywyLjUxMyw1Ljk0Miw1Ljk0MiwwLDAsMC0xLjE4NywzLjYzOSw1LjEsNS4xLDAsMCwwLC43MjMsMi45NjMsNy4wODUsNy4wODUsMCwwLDAsMi4xNzMsMi4xNzMsMTUuNCwxNS40LDAsMCwwLDMuMjEsMS41NzIsMzAuOTk0LDMwLjk5NCwwLDAsMCwzLjg4NCwxLjEyOGw1LjY3NCwxLjM1N2EzOS45ODksMzkuOTg5LDAsMCwxLDcuNTg4LDIuNDY3LDIzLjA4MywyMy4wODMsMCwwLDEsNS45ODIsMy43OTMsMTUuOTQ5LDE1Ljk0OSwwLDAsMSwzLjkzMyw1LjMwNiwxNi45MjEsMTYuOTIxLDAsMCwxLDEuNDM2LDcsMTcuNDY5LDE3LjQ2OSwwLDAsMS0yLjk0NiwxMC4wMzksMTguNzc1LDE4Ljc3NSwwLDAsMS04LjM5LDYuNTY5LDMzLjYxMywzMy42MTMsMCwwLDEtMTMuMTg0LDIuMzI5LDM0LjY0OSwzNC42NDksMCwwLDEtMTMuMzA3LTIuMzQzLDE5LjM4OSwxOS4zODksMCwwLDEtOC44MjEtNi45NTQsMjAuNTgsMjAuNTgsMCwwLDEtMy4zMTUtMTEuNDI4aDEyLjkyMmE5LjU1OCw5LjU1OCwwLDAsMCwxLjgzNSw1LjI5LDkuODM2LDkuODM2LDAsMCwwLDQuMzQ4LDMuMTc2LDE2LjksMTYuOSwwLDAsMCw2LjE4MywxLjA2NSwxNi4xMzMsMTYuMTMzLDAsMCwwLDUuOTA3LS45ODYsOS4wMzEsOS4wMzEsMCwwLDAsMy45LTIuNzQ2LDYuMzI5LDYuMzI5LDAsMCwwLDEuMzg5LTQuMDQsNS4yOTEsNS4yOTEsMCwwLDAtMS4yNDktMy41NzgsOS43MzIsOS43MzIsMCwwLDAtMy42MzktMi40NjcsMzcuNDY2LDM3LjQ2NiwwLDAsMC01Ljg0NC0xLjg1MWwtNi44NzctMS43MjdxLTcuOTkxLTEuOTQ0LTEyLjYxNC02LjA3NVQ4OS41LDM4LjM1MWExNi41LDE2LjUsMCwwLDEsMy4wNjgtMTAuMDI0LDIwLjQ5MiwyMC40OTIsMCwwLDEsOC41My02LjY5MywzMC4xNjgsMzAuMTY4LDAsMCwxLDEyLjMzMy0yLjQwNiwyOS4zMjYsMjkuMzI2LDAsMCwxLDEyLjI5NCwyLjQwNiwxOS40MzksMTkuNDM5LDAsMCwxLDguMTg2LDYuNjkzLDE3LjcwNiwxNy43MDYsMCwwLDEsMy4wMjMsOS45MzFaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtODcuODMxIC0xOS4yMjgpIiBmaWxsPSIjMzMzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NjEiIGRhdGEtbmFtZT0iUGF0aCAxNTQ2MSIgZD0iTTEzMC42NjQsNTUuNDg3VjgyLjg3NEgxMTcuNTI3VjE5LjcxMWgxMi43NjdWNDMuODZoLjU1NWExMy40ODksMTMuNDg5LDAsMCwxLDUuMTgyLTYuNTg2LDE1LjgyNCwxNS44MjQsMCwwLDEsOC45NzUtMi4zOSwxNi44NTYsMTYuODU2LDAsMCwxLDguNjIxLDIuMTQzLDE0LjY4MSwxNC42ODEsMCwwLDEsNS43MzUsNi4xMzgsMjAuNDQyLDIwLjQ0MiwwLDAsMSwyLjAxOSw5LjU0NlY4Mi44NzRIMTQ4LjI0NFY1NS4wNTVhOS42MTYsOS42MTYsMCwwLDAtMi4yMDUtNi44MTYsOC4wNTcsOC4wNTcsMCwwLDAtNi4yNDUtMi40MzQsOS41ODUsOS41ODUsMCwwLDAtNC43MzYsMS4xNCw4LjAxMiw4LjAxMiwwLDAsMC0zLjIwNiwzLjMxNSwxMS4yMjYsMTEuMjI2LDAsMCwwLTEuMTg3LDUuMjI3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjQuMzcgLTE4Ljg0NikiIGZpbGw9IiMzMzMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ2MiIgZGF0YS1uYW1lPSJQYXRoIDE1NDYyIiBkPSJNMjI1LjA4NSw3MC41NTJjLS4zMzEuMDYzLS44LjE1LTEuNDE4LjI2M2ExMC4yOCwxMC4yOCwwLDAsMS0xLjg1My4xNyw2LjIxMiw2LjIxMiwwLDAsMS0yLjMyNy0uNCwzLjAyLDMuMDIsMCwwLDEtMS41NTctMS40LDUuODg0LDUuODg0LDAsMCwxLS41NTUtMi44MjFWNDMuNDExaDguOTExdi05Ljg3aC04LjkxMVYyMi4xOTJIMjA0LjIzNFYzMy41NDFoLTYuNDc2djkuODdoNi40NzZWNjguMDg1YTEzLjc2MSwxMy43NjEsMCwwLDAsMS45NDYsNy43MSwxMS42MTEsMTEuNjExLDAsMCwwLDUuNTM1LDQuNSwxOS45MTcsMTkuOTE3LDAsMCwwLDguMzEzLDEuMjY0LDIzLjE3NSwyMy4xNzUsMCwwLDAsNC4zNDgtLjUwOHExLjc4OC0uNDE2LDIuNzc2LS43MjdaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC45ODQgLTE2Ljg4NikiIGZpbGw9IiMzMzMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ2MyIgZGF0YS1uYW1lPSJQYXRoIDE1NDYzIiBkPSJNMjI4Ljc2Myw1NS40ODdWODIuODc0SDIxNS42MjZWMTkuNzExaDEyLjc2N1Y0My44NmguNTU1YTEzLjQ4OSwxMy40ODksMCwwLDEsNS4xODItNi41ODYsMTUuODI0LDE1LjgyNCwwLDAsMSw4Ljk3NS0yLjM5LDE2Ljg1NiwxNi44NTYsMCwwLDEsOC42MjEsMi4xNDMsMTQuNjgyLDE0LjY4MiwwLDAsMSw1LjczNSw2LjEzOCwyMC40NDIsMjAuNDQyLDAsMCwxLDIuMDE5LDkuNTQ2VjgyLjg3NEgyNDYuMzQzVjU1LjA1NWE5LjYxNiw5LjYxNiwwLDAsMC0yLjIwNS02LjgxNiw4LjA1Nyw4LjA1NywwLDAsMC02LjI0NS0yLjQzNCw5LjU4NSw5LjU4NSwwLDAsMC00LjczNiwxLjE0LDcuOTkxLDcuOTkxLDAsMCwwLTMuMjA2LDMuMzE1LDExLjIyNSwxMS4yMjUsMCwwLDAtMS4xODcsNS4yMjciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzLjEzMiAtMTguODQ2KSIgZmlsbD0iIzMzMyI+PC9wYXRoPjxyZWN0IGlkPSJSZWN0YW5nbGVfMzMwNCIgZGF0YS1uYW1lPSJSZWN0YW5nbGUgMzMwNCIgd2lkdGg9IjEzLjEzNyIgaGVpZ2h0PSI0Ny4zNzMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI3Ni44NDQgMTYuNjU3KSIgZmlsbD0iIzMzMyI+PC9yZWN0PjxyZWN0IGlkPSJSZWN0YW5nbGVfMzMwNSIgZGF0YS1uYW1lPSJSZWN0YW5nbGUgMzMwNSIgd2lkdGg9IjEzLjEzNyIgaGVpZ2h0PSI2My4xNjMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI5NC4zMzcgMC44NjUpIiBmaWxsPSIjMzMzIj48L3JlY3Q+PHJlY3QgaWQ9IlJlY3RhbmdsZV8zMzA2IiBkYXRhLW5hbWU9IlJlY3RhbmdsZSAzMzA2IiB3aWR0aD0iMTMuMTM3IiBoZWlnaHQ9IjYzLjE2MyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzExLjgyNSAwLjg2NSkiIGZpbGw9IiMzMzMiPjwvcmVjdD48cGF0aCBpZD0iUGF0aF8xNTQ2NCIgZGF0YS1uYW1lPSJQYXRoIDE1NDY0IiBkPSJNMjIwLjA0LDI4LjAwN2EyMy42MiwyMy42MiwwLDAsMC05LjY1NCwyLjA2MiwyNC41LDI0LjUsMCwwLDAtNy4wNDcsNC43NDVsLS4wMTYtLjAyTDE3Ni41NDUsNjJhMTMuMjU5LDEzLjI1OSwwLDAsMS05LjEsMy44ODgsMTMuMDM2LDEzLjAzNiwwLDAsMSwwLTI2LjA2OCwxMi42MTYsMTIuNjE2LDAsMCwxLDguMzI3LDMuMTc3bC4yLjIsOC4xMTMsOC4xNDYsOC4yNDgtOC4zNzktNy4wNjItNy4wMzgtMS4xMjEtMS4xYTI0LjUsMjQuNSwwLDAsMC03LjA0Ny00Ljc0NSwyMy42MiwyMy42MiwwLDAsMC05LjY1NC0yLjA2MiwyNC44NDcsMjQuODQ3LDAsMCwwLDAsNDkuNjg2LDIzLjg2NiwyMy44NjYsMCwwLDAsOS41OTEtMiwyNC4zLDI0LjMsMCwwLDAsNy4xMTUtNC43MzNMMjEwLjA2LDQ0LjcxbDEuNjI3LTEuNjkzYTEyLjYzMywxMi42MzMsMCwwLDEsOC4zNTItMy4yLDEzLjAzNywxMy4wMzcsMCwwLDEsMCwyNi4wNjgsMTIsMTIsMCwwLDEtOC45Ny0zLjc1NmwtNy44LTcuOTQyLTguMjUsOC4zODEsOC4zMjcsOC40YTI0LjM4MywyNC4zODMsMCwwLDAsNy4xLDQuNzI0LDIzLjg3NSwyMy44NzUsMCwwLDAsOS41OTMsMiwyNC44NDcsMjQuODQ3LDAsMCwwLDAtNDkuNjg2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDQuMjExIC0xMi4yOTIpIiBmaWxsPSIjMzMzIj48L3BhdGg+PC9nPjxwYXRoIGlkPSJQYXRoXzE1NDY1IiBkYXRhLW5hbWU9IlBhdGggMTU0NjUiIGQ9Ik0yNDkuMDQ5LDMxLjY5M2E2LjU3Myw2LjU3MywwLDAsMS02LjU0OC02LjU1NSw2LjU0OSw2LjU0OSwwLDEsMSwxMS4xNzUsNC42MjcsNi4zLDYuMywwLDAsMS00LjYyNywxLjkyOCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzQuNjI2IC0xOC42MTEpIiBmaWxsPSIjMzMzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NjYiIGRhdGEtbmFtZT0iUGF0aCAxNTQ2NiIgZD0iTTI3OC41NTcsMzEuNjkyYTYuNDEzLDYuNDEzLDAsMCwxLTIuNTQ0LS41LDYuNiw2LjYsMCwwLDEtMy40OTEtMy40OTIsNi42MzUsNi42MzUsMCwwLDEsMC01LjA4Niw2LjYsNi42LDAsMCwxLDMuNDkxLTMuNDkxLDYuNjM1LDYuNjM1LDAsMCwxLDUuMDg1LDAsNi41OTQsNi41OTQsMCwwLDEsMy40ODksMy40OTEsNi42MTMsNi42MTMsMCwwLDEsMCw1LjA4Niw2LjUzLDYuNTMsMCwwLDEtMS40MDUsMi4wODUsNi42MTcsNi42MTcsMCwwLDEtMi4wODQsMS40MDcsNi40MjQsNi40MjQsMCwwLDEtMi41NDIuNW0wLTEuNTY4YTQuNzg4LDQuNzg4LDAsMCwwLDIuNS0uNjcxLDUuMDYyLDUuMDYyLDAsMCwwLDEuOC0xLjgsNC45ODksNC45ODksMCwwLDAsMC01LDUuMDY3LDUuMDY3LDAsMCwwLTEuOC0xLjgsNS4wMDUsNS4wMDUsMCwwLDAtNSwwLDUuMDgsNS4wOCwwLDAsMC0xLjgsMS44LDUuMDExLDUuMDExLDAsMCwwLDAsNSw1LjA3NSw1LjA3NSwwLDAsMCwxLjgsMS44LDQuOCw0LjgsMCwwLDAsMi41LjY3MW0tMi4yOS0yLjAyOFYyMi4wNjFoMy4wNTdhMS44NTYsMS44NTYsMCwwLDEsLjguMjA5LDEuOTU5LDEuOTU5LDAsMCwxLC43NDEuNjM3LDEuODI0LDEuODI0LDAsMCwxLC4zLDEuMDg1LDEuOTQyLDEuOTQyLDAsMCwxLS4zMTcsMS4xMjQsMi4xNTUsMi4xNTUsMCwwLDEtLjc3My43LDEuODU4LDEuODU4LDAsMCwxLS44NTQuMjM2aC0yLjIwN3YtLjk3OWgxLjhhLjkzNy45MzcsMCwwLDAsLjU4NS0uMjcsMS4wMDksMS4wMDksMCwwLDAsLjMxNS0uODA5LjgxOS44MTksMCwwLDAtLjMxNS0uNzU0LDEuMDgzLDEuMDgzLDAsMCwwLS41NTEtLjJoLTEuMjU4VjI4LjFabTMuNjQ1LTIuODQ0LDEuNSwyLjg0NGgtMS40NTNsLTEuNDcxLTIuODQ0WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTcuOTQ0IC0xOC42MTIpIiBmaWxsPSIjMzMzIj48L3BhdGg+PC9nPjwvZz48L3N2Zz4g';
import type { Phase, RetainerOption, UpfrontItem } from '@/types/proposal';

interface TemplateSection {
  heading: string;
  body: string;
}

export const SIMON_SIGNATURE_URI = 'data:image/png;base64,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';

export interface ServiceAgreementPDFProps {
  // Dynamic — from proposal + customer selections
  clientName: string;
  organisation: string;
  programmeTitle: string;
  agreementDate: string;
  phases: Phase[];
  upfrontItems: UpfrontItem[];
  selectedStandard: RetainerOption | null;
  selectedExtras: RetainerOption[];
  upfrontTotal: number;
  monthlyTotal: number;
  firstYearTotal: number;
  paymentTerms: string;
  contactName: string;
  contactEmail: string;
  // Static — from chosen template
  templateSections: TemplateSection[];
  // Signature data — passed at signing time to embed into execution block
  clientSignerName?: string;
  clientSignerTitle?: string;
  clientSignatureUri?: string;
  signingDate?: string;
}

const NAVY = '#043D5D';
const BLUE = '#009FE3';
const MID = '#3A6278';
const LIGHT = '#AAAAAA';
const BG = '#F4F7FA';

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    paddingTop: 48,
    paddingBottom: 56,
    paddingLeft: 56,
    paddingRight: 56,
  },
  // Header
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: 'white',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 56,
    paddingRight: 56,
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
  },
  headerLogo: {
    height: 28,
    width: 105,
  },
  headerSub: {
    fontSize: 10,
    color: MID,
  },
  accentStripe: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: BLUE,
  },
  // Sections
  sectionHeader: {
    backgroundColor: '#E8F4FB',
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 6,
    marginTop: 14,
  },
  sectionHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  sectionBody: {
    fontSize: 9,
    color: '#222222',
    lineHeight: 1.5,
    marginBottom: 4,
  },
  // Meta table
  metaRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  metaLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    width: 120,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metaValue: {
    fontSize: 9,
    color: '#111111',
    flex: 1,
  },
  // Charges table
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
    paddingVertical: 4,
  },
  tableRowBold: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: NAVY,
    paddingVertical: 4,
    marginTop: 2,
  },
  tableDesc: {
    flex: 1,
    fontSize: 9,
    color: '#222222',
  },
  tableDescBold: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
  },
  tableAmt: {
    fontSize: 9,
    color: '#222222',
    textAlign: 'right',
    width: 100,
  },
  tableAmtBold: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: NAVY,
    textAlign: 'right',
    width: 100,
  },
  // Execution
  execRow: {
    flexDirection: 'row',
    gap: 24,
    marginTop: 16,
  },
  execCol: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#DDE8EE',
    paddingTop: 8,
  },
  execLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: LIGHT,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  execLine: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#DDE8EE',
    marginBottom: 10,
    paddingBottom: 16,
  },
  execLineLabel: {
    fontSize: 7,
    color: LIGHT,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 56,
    right: 56,
    borderTopWidth: 0.5,
    borderTopColor: '#DDE8EE',
    paddingTop: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: LIGHT,
  },
  spacer: { height: 8 },
  divider: { borderBottomWidth: 0.5, borderBottomColor: '#DDE8EE', marginVertical: 8 },
  partiesText: { fontSize: 9, color: '#222222', lineHeight: 1.5, marginBottom: 6 },
});

const fmt = (n: number) =>
  `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const optionTotal = (r: RetainerOption) => (r.quantity ?? 1) * r.price;

export function ServiceAgreementPDF({
  clientName,
  organisation,
  programmeTitle,
  agreementDate,
  phases,
  upfrontItems,
  selectedStandard,
  selectedExtras,
  upfrontTotal,
  monthlyTotal,
  firstYearTotal,
  paymentTerms,
  contactName,
  contactEmail,
  templateSections,
  clientSignerName,
  clientSignerTitle,
  clientSignatureUri,
  signingDate,
}: ServiceAgreementPDFProps) {
  const entityName = organisation || clientName;

  return (
    <Document title={`Service Agreement — ${entityName}`} author="Shoothill Limited">
      <Page size="A4" style={styles.page}>
        {/* Fixed header */}
        <View style={styles.headerBar} fixed>
          <Image src={SHOOTHILL_LOGO_URI} style={styles.headerLogo} />
          <Text style={styles.headerSub}>Service Agreement</Text>
        </View>
        <View style={styles.accentStripe} fixed />

        {/* Top spacer to clear fixed header */}
        <View style={{ height: 20 }} />

        {/* Agreement meta */}
        <View style={{ marginBottom: 12 }}>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Agreement Date</Text>
            <Text style={styles.metaValue}>{agreementDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Client</Text>
            <Text style={styles.metaValue}>{entityName}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>Programme</Text>
            <Text style={styles.metaValue}>{programmeTitle}</Text>
          </View>
          {selectedStandard?.term_months && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Initial Term</Text>
              <Text style={styles.metaValue}>{selectedStandard.term_months} months</Text>
            </View>
          )}
        </View>
        <Text style={{ fontSize: 7, color: LIGHT, marginBottom: 10 }}>
          Shoothill Ltd · Willow House East, Shrewsbury Business Park, SY2 6LG · Company No. 05885234
        </Text>
        <View style={styles.divider} />

        {/* Parties */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Parties</Text>
        </View>
        <Text style={styles.partiesText}>
          This Agreement is made between: (1) SHOOTHILL LIMITED, a company incorporated in England and Wales with registered number 05885234 whose registered office is at Willow House East, Shrewsbury Business Park, Shrewsbury, England, SY2 6LG (the "Supplier"); and (2) {entityName} (the "Customer"). Together referred to as the "Parties".
        </Text>

        {/* Schedule 1 — Scope */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Schedule 1 — Scope of Work</Text>
        </View>
        {phases.length > 0 ? (
          phases.map((phase, i) => (
            <View key={i} style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY }}>
                {phase.label}{phase.title ? `: ${phase.title}` : ''}{phase.duration ? `  (${phase.duration})` : ''}{phase.price ? `  — ${phase.price.startsWith('£') ? phase.price : `£${phase.price}`}` : ''}
              </Text>
              {phase.tasks.filter(Boolean).map((task, j) => (
                <Text key={j} style={{ fontSize: 8, color: MID, paddingLeft: 12 }}>• {task}</Text>
              ))}
            </View>
          ))
        ) : (
          <Text style={styles.sectionBody}>{programmeTitle} — services as described in the Supplier's Proposal.</Text>
        )}

        {/* Schedule 2 — Charges */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Schedule 2 — Charges and Payment Terms</Text>
        </View>

        {/* Upfront items */}
        {upfrontItems.map((item, i) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.tableDesc}>{item.name || item.type}</Text>
            <Text style={styles.tableAmt}>{fmt(item.price)} + VAT</Text>
          </View>
        ))}
        {upfrontItems.length > 0 && (
          <View style={styles.tableRowBold}>
            <Text style={styles.tableDescBold}>One-Time Project Total</Text>
            <Text style={styles.tableAmtBold}>{fmt(upfrontTotal)} + VAT</Text>
          </View>
        )}

        {/* Monthly — shown if any ongoing items are present */}
        {(selectedStandard || selectedExtras.length > 0) && (
          <>
            <View style={{ height: 6 }} />
            {selectedStandard && (
              <View style={styles.tableRow}>
                <Text style={styles.tableDesc}>{selectedStandard.name || selectedStandard.type} /month{selectedStandard.term_months ? ` (${selectedStandard.term_months} months)` : ''}</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(selectedStandard))} + VAT/month</Text>
              </View>
            )}
            {selectedExtras.map((extra, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableDesc}>{extra.name || extra.type} /month{extra.term_months ? ` (${extra.term_months} months)` : ''}</Text>
                <Text style={styles.tableAmt}>{fmt(optionTotal(extra))} + VAT/month</Text>
              </View>
            ))}
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>Monthly Support Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(monthlyTotal)} + VAT/month</Text>
            </View>
            <View style={{ height: 4 }} />
            <View style={styles.tableRowBold}>
              <Text style={styles.tableDescBold}>First Year Total</Text>
              <Text style={styles.tableAmtBold}>{fmt(firstYearTotal)} + VAT</Text>
            </View>
          </>
        )}

        {paymentTerms ? (
          <View style={{ marginTop: 8, padding: 8, backgroundColor: BG }}>
            <Text style={{ fontSize: 8, fontFamily: 'Helvetica-Bold', color: LIGHT, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 }}>Payment Terms</Text>
            <Text style={{ fontSize: 9, color: '#222222' }}>{paymentTerms}</Text>
          </View>
        ) : null}

        {/* Template sections (legal clauses) */}
        {templateSections.map((section, i) => (
          <View key={i} wrap={false} style={{ marginTop: 2 }}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeading}>{section.heading}</Text>
            </View>
            <Text style={styles.sectionBody}>{section.body}</Text>
          </View>
        ))}

        {/* Execution block */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeading}>Execution</Text>
        </View>
        <Text style={{ fontSize: 9, color: '#222222', marginBottom: 10 }}>
          IN WITNESS WHEREOF the parties have signed this Agreement on {signingDate || agreementDate}.
        </Text>
        <View style={styles.execRow}>
          {/* Shoothill side — always pre-filled */}
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For Shoothill Limited</Text>
            {/* Signature image or electronic placeholder */}
            <View style={{ backgroundColor: '#FFFFFF', borderWidth: 0.5, borderColor: '#DDE8EE', height: 52, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
              {SIMON_SIGNATURE_URI ? (
                <Image src={SIMON_SIGNATURE_URI} style={{ height: 44, width: 160 }} />
              ) : (
                <Text style={{ fontSize: 7, color: '#CCCCCC' }}>Electronic signature</Text>
              )}
            </View>
            <View style={{ borderTopWidth: 0.5, borderTopColor: '#DDE8EE', paddingTop: 5 }}>
              <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 }}>Simon Jeavons</Text>
              <Text style={{ fontSize: 8, color: MID, marginBottom: 2 }}>Group Managing Director</Text>
              <Text style={{ fontSize: 7, color: LIGHT }}>Shoothill Limited</Text>
              {signingDate ? (
                <Text style={{ fontSize: 7, color: LIGHT, marginTop: 2 }}>{signingDate}</Text>
              ) : null}
            </View>
          </View>
          {/* Client side — filled at signing time */}
          <View style={styles.execCol}>
            <Text style={styles.execLabel}>For {entityName}</Text>
            {clientSignatureUri ? (
              <>
                <View style={{ backgroundColor: '#F4F7FA', borderWidth: 0.5, borderColor: '#DDE8EE', height: 52, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
                  <Image src={clientSignatureUri} style={{ height: 44, width: 160 }} />
                </View>
                <View style={{ borderTopWidth: 0.5, borderTopColor: '#DDE8EE', paddingTop: 5 }}>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 2 }}>{clientSignerName}</Text>
                  {clientSignerTitle ? (
                    <Text style={{ fontSize: 8, color: MID, marginBottom: 2 }}>{clientSignerTitle}</Text>
                  ) : null}
                  <Text style={{ fontSize: 7, color: LIGHT }}>{entityName}</Text>
                  {signingDate ? (
                    <Text style={{ fontSize: 7, color: LIGHT, marginTop: 2 }}>{signingDate}</Text>
                  ) : null}
                </View>
              </>
            ) : (
              <>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Authorised Signatory</Text></View>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Print Name</Text></View>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Job Title</Text></View>
                <View style={styles.execLine}><Text style={styles.execLineLabel}>Date</Text></View>
              </>
            )}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Shoothill Ltd · {contactName} · {contactEmail}
          </Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
