import { Document, Image, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const SHOOTHILL_LOGO_URI =
  'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4gPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MDAiIGhlaWdodD0iMTMzLjA3MiIgdmlld0JveD0iMCAwIDUwMCAxMzMuMDcyIj48ZyBpZD0iR3JvdXBfMTAyMTEiIGRhdGEtbmFtZT0iR3JvdXAgMTAyMTEiIHRyYW5zZm9ybT0idHJhbnNsYXRlKC02MjIgLTc3Ny43NTIpIj48ZyBpZD0iR3JvdXBfOTkzMiIgZGF0YS1uYW1lPSJHcm91cCA5OTMyIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg2MjIgNzc3Ljc1MikiPjxwYXRoIGlkPSJQYXRoXzE1NDQ4IiBkYXRhLW5hbWU9IlBhdGggMTU0NDgiIGQ9Ik00MC40NjgsMjAuNDE2QTM4LjY5LDM4LjY5LDAsMCwxLDczLjM2LDUzLjE1YS41NjUuNTY1LDAsMCwwLC41Ni40ODVoOS4yNThhLjU2NC41NjQsMCwwLDAsLjU2Mi0uNjMsNDkuMTYzLDQ5LjE2MywwLDAsMC00My4xMzMtNDIuOTcuNTY2LjU2NiwwLDAsMC0uNjI4LjU2MnY5LjI1OGEuNTY3LjU2NywwLDAsMCwuNDg5LjU2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgzMS41ODUgNy45MjYpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NDkiIGRhdGEtbmFtZT0iUGF0aCAxNTQ0OSIgZD0iTTUzLjMxNCwxMC4wMzZBNDkuMTcsNDkuMTcsMCwwLDAsMTAuMTgsNTMuMDA2YS41NjkuNTY5LDAsMCwwLC41NjQuNjMySDIwYS41NjUuNTY1LDAsMCwwLC41Ni0uNDg3QTM4LjY5MiwzOC42OTIsMCwwLDEsNTMuNDU0LDIwLjQxNmEuNTY1LjU2NSwwLDAsMCwuNDg5LS41NlYxMC42YS41NjYuNTY2LDAsMCwwLS42MjgtLjU2NCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoOC4wNCA3LjkyNSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MCIgZGF0YS1uYW1lPSJQYXRoIDE1NDUwIiBkPSJNODMuNjQ1LDM5LjkzMmEuNTY2LjU2NiwwLDAsMC0uNDIxLS4xODhINzMuOTY3YS41NjYuNTY2LDAsMCwwLS41NjIuNDkyLDM4LjYyNywzOC42MjcsMCwwLDEtMzIuOTM3LDMzLjEuNTY1LjU2NSwwLDAsMC0uNDg5LjU2djkuMjU2YS41NjcuNTY3LDAsMCwwLC4xODguNDIyLjU3My41NzMsMCwwLDAsLjM3OC4xNDVjLjAyMSwwLC4wNDEsMCwuMDYzLDBBNDkuMTA1LDQ5LjEwNSwwLDAsMCw4My43ODcsNDAuMzcxYS41NjQuNTY0LDAsMCwwLS4xNDEtLjQzOSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEuNTg1IDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MSIgZGF0YS1uYW1lPSJQYXRoIDE1NDUxIiBkPSJNNTMuNDczLDczLjMzMWEzOC42MjUsMzguNjI1LDAsMCwxLTMyLjkzOS0zMy4xLjU2Ny41NjcsMCwwLDAtLjU2Mi0uNDkySDEwLjcxOGEuNTY2LjU2NiwwLDAsMC0uNTY0LjYyN0E0OS4xLDQ5LjEsMCwwLDAsNTMuMzM0LDgzLjcxMmMuMDIxLDAsLjA0MSwwLC4wNjMsMGEuNTY2LjU2NiwwLDAsMCwuNTY2LS41NjZWNzMuODkyYS41NjcuNTY3LDAsMCwwLS40ODktLjU2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg4LjAyIDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MiIgZGF0YS1uYW1lPSJQYXRoIDE1NDUyIiBkPSJNNDAuNTQ1LDU3LjA1MmEuNTg4LjU4OCwwLDAsMCwuMTM2LS4wMTZBMjIuNjg0LDIyLjY4NCwwLDAsMCw1Ny4yNjksNDAuNDQ3YS41NjguNTY4LDAsMCwwLS41NS0uN2gtOC4wMWEuNTY3LjU2NywwLDAsMC0uNTI2LjM1OCwxNC4wNzQsMTQuMDc0LDAsMCwxLTcuODQ4LDcuODQ4LjU2Ni41NjYsMCwwLDAtLjM1Ni41MjZ2OC4wMWEuNTY0LjU2NCwwLDAsMCwuNTY2LjU2NiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzEuNTg1IDMxLjM5OSkiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1MyIgZGF0YS1uYW1lPSJQYXRoIDE1NDUzIiBkPSJNNDAuMzM2LDMzLjgyNGExNC4wNzksMTQuMDc5LDAsMCwxLDcuODQ4LDcuODQ4LjU2NS41NjUsMCwwLDAsLjUyNi4zNThoOC4wMWEuNTY3LjU2NywwLDAsMCwuNTUtLjcsMjIuNjg0LDIyLjY4NCwwLDAsMC0xNi41ODgtMTYuNTkuNTc5LjU3OSwwLDAsMC0uNDg1LjEwNi41NjYuNTY2LDAsMCwwLS4yMTguNDQ2VjMzLjNhLjU2OC41NjgsMCwwLDAsLjM1OC41MjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDMxLjU4NCAxOS41MzIpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NTQiIGRhdGEtbmFtZT0iUGF0aCAxNTQ1NCIgZD0iTTQxLjkwOCw0Ny45NDlBMTQuMDY5LDE0LjA2OSwwLDAsMSwzNC4wNjEsNDAuMWEuNTcyLjU3MiwwLDAsMC0uNTI4LS4zNThIMjUuNTI0YS41NjguNTY4LDAsMCwwLS41NS43QTIyLjY3OSwyMi42NzksMCwwLDAsNDEuNTYzLDU3LjAzNWEuNTg3LjU4NywwLDAsMCwuMTM2LjAxNi41NjcuNTY3LDAsMCwwLC41NjctLjU2NnYtOC4wMWEuNTY4LjU2OCwwLDAsMC0uMzU4LS41MjYiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDE5LjcxNyAzMS4zOTkpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NTUiIGRhdGEtbmFtZT0iUGF0aCAxNTQ1NSIgZD0iTTQxLjU2MywyNC43NEEyMi42NzYsMjIuNjc2LDAsMCwwLDI0Ljk3NSw0MS4zMjhhLjU2OC41NjgsMCwwLDAsLjU1LjdoOC4wMDlhLjU2NS41NjUsMCwwLDAsLjUyNi0uMzU4LDE0LjA3MiwxNC4wNzIsMCwwLDEsNy44NDktNy44NDguNTcyLjU3MiwwLDAsMCwuMzU4LS41MjhWMjUuMjg5YS41NjguNTY4LDAsMCwwLS43LS41NSIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMTkuNzE3IDE5LjUzMikiIGZpbGw9IiMwMDlmZTMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ1NiIgZGF0YS1uYW1lPSJQYXRoIDE1NDU2IiBkPSJNNDAuMzM0LDY2LjY2SDM2LjNhLjI3OC4yNzgsMCwwLDAtLjI3Ny4yNzdWNzguMTEzYTIuMywyLjMsMCwwLDAsNC41OTEsMFY2Ni45MzdhLjI3OS4yNzksMCwwLDAtLjI3Ny0uMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyOC40NTcgNTIuNjY0KSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU3IiBkYXRhLW5hbWU9IlBhdGggMTU0NTciIGQ9Ik0xMy43NDgsNDAuMlYzNi4xNjVhLjI3OC4yNzgsMCwwLDAtLjI3Ny0uMjc3SDIuMjk1YTIuMywyLjMsMCwwLDAsMCw0LjU5MUgxMy40N2EuMjc5LjI3OSwwLDAsMCwuMjc3LS4yNzciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMjguMzUzKSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU4IiBkYXRhLW5hbWU9IlBhdGggMTU0NTgiIGQ9Ik02Ni42Niw0MC4yVjM2LjE2NWEuMjc4LjI3OCwwLDAsMSwuMjc3LS4yNzdINzguMTEzYTIuMywyLjMsMCwwLDEsMCw0LjU5MUg2Ni45MzdhLjI3OS4yNzksMCwwLDEtLjI3Ny0uMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSg1Mi42NjQgMjguMzUzKSIgZmlsbD0iIzAwOWZlMyI+PC9wYXRoPjxwYXRoIGlkPSJQYXRoXzE1NDU5IiBkYXRhLW5hbWU9IlBhdGggMTU0NTkiIGQ9Ik0zNi4zLDEzLjc0OGg0LjAzN2EuMjc4LjI3OCwwLDAsMCwuMjc3LS4yNzdWMi4yOTVhMi4zLDIuMywwLDAsMC00LjU5MSwwVjEzLjQ3YS4yNzkuMjc5LDAsMCwwLC4yNzcuMjc3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyOC40NTcpIiBmaWxsPSIjMDA5ZmUzIj48L3BhdGg+PC9nPjxnIGlkPSJHcm91cF85OTMzIiBkYXRhLW5hbWU9Ikdyb3VwIDk5MzMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc3OC45NjEgODExLjA2OCkiPjxnIGlkPSJHcm91cF85OTM1IiBkYXRhLW5hbWU9Ikdyb3VwIDk5MzUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDAgMS4xMDMpIj48cGF0aCBpZD0iUGF0aF8xNTQ2MCIgZGF0YS1uYW1lPSJQYXRoIDE1NDYwIiBkPSJNMTI0LjEzMSwzOC4yNThhNy44MDYsNy44MDYsMCwwLDAtMy4xNzctNS44LDEyLjYsMTIuNiwwLDAsMC03LjYxNy0yLjA2NiwxNC43NzQsMTQuNzc0LDAsMCwwLTUuNTIyLjkwOSw3Ljc1NSw3Ljc1NSwwLDAsMC0zLjQzNywyLjUxMyw1Ljk0Miw1Ljk0MiwwLDAsMC0xLjE4NywzLjYzOSw1LjEsNS4xLDAsMCwwLC43MjMsMi45NjMsNy4wODUsNy4wODUsMCwwLDAsMi4xNzMsMi4xNzMsMTUuNCwxNS40LDAsMCwwLDMuMjEsMS41NzIsMzAuOTk0LDMwLjk5NCwwLDAsMCwzLjg4NCwxLjEyOGw1LjY3NCwxLjM1N2EzOS45ODksMzkuOTg5LDAsMCwxLDcuNTg4LDIuNDY3LDIzLjA4MywyMy4wODMsMCwwLDEsNS45ODIsMy43OTMsMTUuOTQ5LDE1Ljk0OSwwLDAsMSwzLjkzMyw1LjMwNiwxNi45MjEsMTYuOTIxLDAsMCwxLDEuNDM2LDcsMTcuNDY5LDE3LjQ2OSwwLDAsMS0yLjk0NiwxMC4wMzksMTguNzc1LDE4Ljc3NSwwLDAsMS04LjM5LDYuNTY5LDMzLjYxMywzMy42MTMsMCwwLDEtMTMuMTg0LDIuMzI5LDM0LjY0OSwzNC42NDksMCwwLDEtMTMuMzA3LTIuMzQzLDE5LjM4OSwxOS4zODksMCwwLDEtOC44MjEtNi45NTQsMjAuNTgsMjAuNTgsMCwwLDEtMy4zMTUtMTEuNDI4aDEyLjkyMmE5LjU1OCw5LjU1OCwwLDAsMCwxLjgzNSw1LjI5LDkuODM2LDkuODM2LDAsMCwwLDQuMzQ4LDMuMTc2LDE2LjksMTYuOSwwLDAsMCw2LjE4MywxLjA2NSwxNi4xMzMsMTYuMTMzLDAsMCwwLDUuOTA3LS45ODYsOS4wMzEsOS4wMzEsMCwwLDAsMy45LTIuNzQ2LDYuMzI5LDYuMzI5LDAsMCwwLDEuMzg5LTQuMDQsNS4yOTEsNS4yOTEsMCwwLDAtMS4yNDktMy41NzgsOS43MzIsOS43MzIsMCwwLDAtMy42MzktMi40NjcsMzcuNDY2LDM3LjQ2NiwwLDAsMC01Ljg0NC0xLjg1MWwtNi44NzctMS43MjdxLTcuOTkxLTEuOTQ0LTEyLjYxNC02LjA3NVQ4OS41LDM4LjM1MWExNi41LDE2LjUsMCwwLDEsMy4wNjgtMTAuMDI0LDIwLjQ5MiwyMC40OTIsMCwwLDEsOC41My02LjY5MywzMC4xNjgsMzAuMTY4LDAsMCwxLDEyLjMzMy0yLjQwNiwyOS4zMjYsMjkuMzI2LDAsMCwxLDEyLjI5NCwyLjQwNiwxOS40MzksMTkuNDM5LDAsMCwxLDguMTg2LDYuNjkzLDE3LjcwNiwxNy43MDYsMCwwLDEsMy4wMjMsOS45MzFaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtODcuODMxIC0xOS4yMjgpIiBmaWxsPSIjMzMzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NjEiIGRhdGEtbmFtZT0iUGF0aCAxNTQ2MSIgZD0iTTEzMC42NjQsNTUuNDg3VjgyLjg3NEgxMTcuNTI3VjE5LjcxMWgxMi43NjdWNDMuODZoLjU1NWExMy40ODksMTMuNDg5LDAsMCwxLDUuMTgyLTYuNTg2LDE1LjgyNCwxNS44MjQsMCwwLDEsOC45NzUtMi4zOSwxNi44NTYsMTYuODU2LDAsMCwxLDguNjIxLDIuMTQzLDE0LjY4MSwxNC42ODEsMCwwLDEsNS43MzUsNi4xMzgsMjAuNDQyLDIwLjQ0MiwwLDAsMSwyLjAxOSw5LjU0NlY4Mi44NzRIMTQ4LjI0NFY1NS4wNTVhOS42MTYsOS42MTYsMCwwLDAtMi4yMDUtNi44MTYsOC4wNTcsOC4wNTcsMCwwLDAtNi4yNDUtMi40MzQsOS41ODUsOS41ODUsMCwwLDAtNC43MzYsMS4xNCw4LjAxMiw4LjAxMiwwLDAsMC0zLjIwNiwzLjMxNSwxMS4yMjYsMTEuMjI2LDAsMCwwLTEuMTg3LDUuMjI3IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNjQuMzcgLTE4Ljg0NikiIGZpbGw9IiMzMzMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ2MiIgZGF0YS1uYW1lPSJQYXRoIDE1NDYyIiBkPSJNMjI1LjA4NSw3MC41NTJjLS4zMzEuMDYzLS44LjE1LTEuNDE4LjI2M2ExMC4yOCwxMC4yOCwwLDAsMS0xLjg1My4xNyw2LjIxMiw2LjIxMiwwLDAsMS0yLjMyNy0uNCwzLjAyLDMuMDIsMCwwLDEtMS41NTctMS40LDUuODg0LDUuODg0LDAsMCwxLS41NTUtMi44MjFWNDMuNDExaDguOTExdi05Ljg3aC04LjkxMVYyMi4xOTJIMjA0LjIzNFYzMy41NDFoLTYuNDc2djkuODdoNi40NzZWNjguMDg1YTEzLjc2MSwxMy43NjEsMCwwLDAsMS45NDYsNy43MSwxMS42MTEsMTEuNjExLDAsMCwwLDUuNTM1LDQuNSwxOS45MTcsMTkuOTE3LDAsMCwwLDguMzEzLDEuMjY0LDIzLjE3NSwyMy4xNzUsMCwwLDAsNC4zNDgtLjUwOHExLjc4OC0uNDE2LDIuNzc2LS43MjdaIiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtMC45ODQgLTE2Ljg4NikiIGZpbGw9IiMzMzMiPjwvcGF0aD48cGF0aCBpZD0iUGF0aF8xNTQ2MyIgZGF0YS1uYW1lPSJQYXRoIDE1NDYzIiBkPSJNMjI4Ljc2Myw1NS40ODdWODIuODc0SDIxNS42MjZWMTkuNzExaDEyLjc2N1Y0My44NmguNTU1YTEzLjQ4OSwxMy40ODksMCwwLDEsNS4xODItNi41ODYsMTUuODI0LDE1LjgyNCwwLDAsMSw4Ljk3NS0yLjM5LDE2Ljg1NiwxNi44NTYsMCwwLDEsOC42MjEsMi4xNDMsMTQuNjgyLDE0LjY4MiwwLDAsMSw1LjczNSw2LjEzOCwyMC40NDIsMjAuNDQyLDAsMCwxLDIuMDE5LDkuNTQ2VjgyLjg3NEgyNDYuMzQzVjU1LjA1NWE5LjYxNiw5LjYxNiwwLDAsMC0yLjIwNS02LjgxNiw4LjA1Nyw4LjA1NywwLDAsMC02LjI0NS0yLjQzNCw5LjU4NSw5LjU4NSwwLDAsMC00LjczNiwxLjE0LDcuOTkxLDcuOTkxLDAsMCwwLTMuMjA2LDMuMzE1LDExLjIyNSwxMS4yMjUsMCwwLDAtMS4xODcsNS4yMjciIHRyYW5zZm9ybT0idHJhbnNsYXRlKDEzLjEzMiAtMTguODQ2KSIgZmlsbD0iIzMzMyI+PC9wYXRoPjxyZWN0IGlkPSJSZWN0YW5nbGVfMzMwNCIgZGF0YS1uYW1lPSJSZWN0YW5nbGUgMzMwNCIgd2lkdGg9IjEzLjEzNyIgaGVpZ2h0PSI0Ny4zNzMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI3Ni44NDQgMTYuNjU3KSIgZmlsbD0iIzMzMyI+PC9yZWN0PjxyZWN0IGlkPSJSZWN0YW5nbGVfMzMwNSIgZGF0YS1uYW1lPSJSZWN0YW5nbGUgMzMwNSIgd2lkdGg9IjEzLjEzNyIgaGVpZ2h0PSI2My4xNjMiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI5NC4zMzcgMC44NjUpIiBmaWxsPSIjMzMzIj48L3JlY3Q+PHJlY3QgaWQ9IlJlY3RhbmdsZV8zMzA2IiBkYXRhLW5hbWU9IlJlY3RhbmdsZSAzMzA2IiB3aWR0aD0iMTMuMTM3IiBoZWlnaHQ9IjYzLjE2MyIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzExLjgyNSAwLjg2NSkiIGZpbGw9IiMzMzMiPjwvcmVjdD48cGF0aCBpZD0iUGF0aF8xNTQ2NCIgZGF0YS1uYW1lPSJQYXRoIDE1NDY0IiBkPSJNMjIwLjA0LDI4LjAwN2EyMy42MiwyMy42MiwwLDAsMC05LjY1NCwyLjA2MiwyNC41LDI0LjUsMCwwLDAtNy4wNDcsNC43NDVsLS4wMTYtLjAyTDE3Ni41NDUsNjJhMTMuMjU5LDEzLjI1OSwwLDAsMS05LjEsMy44ODgsMTMuMDM2LDEzLjAzNiwwLDAsMSwwLTI2LjA2OCwxMi42MTYsMTIuNjE2LDAsMCwxLDguMzI3LDMuMTc3bC4yLjIsOC4xMTMsOC4xNDYsOC4yNDgtOC4zNzktNy4wNjItNy4wMzgtMS4xMjEtMS4xYTI0LjUsMjQuNSwwLDAsMC03LjA0Ny00Ljc0NSwyMy42MiwyMy42MiwwLDAsMC05LjY1NC0yLjA2MiwyNC44NDcsMjQuODQ3LDAsMCwwLDAsNDkuNjg2LDIzLjg2NiwyMy44NjYsMCwwLDAsOS41OTEtMiwyNC4zLDI0LjMsMCwwLDAsNy4xMTUtNC43MzNMMjEwLjA2LDQ0LjcxbDEuNjI3LTEuNjkzYTEyLjYzMywxMi42MzMsMCwwLDEsOC4zNTItMy4yLDEzLjAzNywxMy4wMzcsMCwwLDEsMCwyNi4wNjgsMTIsMTIsMCwwLDEtOC45Ny0zLjc1NmwtNy44LTcuOTQyLTguMjUsOC4zODEsOC4zMjcsOC40YTI0LjM4MywyNC4zODMsMCwwLDAsNy4xLDQuNzI0LDIzLjg3NSwyMy44NzUsMCwwLDAsOS41OTMsMiwyNC44NDcsMjQuODQ3LDAsMCwwLDAtNDkuNjg2IiB0cmFuc2Zvcm09InRyYW5zbGF0ZSgtNDQuMjExIC0xMi4yOTIpIiBmaWxsPSIjMzMzIj48L3BhdGg+PC9nPjxwYXRoIGlkPSJQYXRoXzE1NDY1IiBkYXRhLW5hbWU9IlBhdGggMTU0NjUiIGQ9Ik0yNDkuMDQ5LDMxLjY5M2E2LjU3Myw2LjU3MywwLDAsMS02LjU0OC02LjU1NSw2LjU0OSw2LjU0OSwwLDEsMSwxMS4xNzUsNC42MjcsNi4zLDYuMywwLDAsMS00LjYyNywxLjkyOCIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoMzQuNjI2IC0xOC42MTEpIiBmaWxsPSIjMzMzIj48L3BhdGg+PHBhdGggaWQ9IlBhdGhfMTU0NjYiIGRhdGEtbmFtZT0iUGF0aCAxNTQ2NiIgZD0iTTI3OC41NTcsMzEuNjkyYTYuNDEzLDYuNDEzLDAsMCwxLTIuNTQ0LS41LDYuNiw2LjYsMCwwLDEtMy40OTEtMy40OTIsNi42MzUsNi42MzUsMCwwLDEsMC01LjA4Niw2LjYsNi42LDAsMCwxLDMuNDkxLTMuNDkxLDYuNjM1LDYuNjM1LDAsMCwxLDUuMDg1LDAsNi41OTQsNi41OTQsMCwwLDEsMy40ODksMy40OTEsNi42MTMsNi42MTMsMCwwLDEsMCw1LjA4Niw2LjUzLDYuNTMsMCwwLDEtMS40MDUsMi4wODUsNi42MTcsNi42MTcsMCwwLDEtMi4wODQsMS40MDcsNi40MjQsNi40MjQsMCwwLDEtMi41NDIuNW0wLTEuNTY4YTQuNzg4LDQuNzg4LDAsMCwwLDIuNS0uNjcxLDUuMDYyLDUuMDYyLDAsMCwwLDEuOC0xLjgsNC45ODksNC45ODksMCwwLDAsMC01LDUuMDY3LDUuMDY3LDAsMCwwLTEuOC0xLjgsNS4wMDUsNS4wMDUsMCwwLDAtNSwwLDUuMDgsNS4wOCwwLDAsMC0xLjgsMS44LDUuMDExLDUuMDExLDAsMCwwLDAsNSw1LjA3NSw1LjA3NSwwLDAsMCwxLjgsMS44LDQuOCw0LjgsMCwwLDAsMi41LjY3MW0tMi4yOS0yLjAyOFYyMi4wNjFoMy4wNTdhMS44NTYsMS44NTYsMCwwLDEsLjguMjA5LDEuOTU5LDEuOTU5LDAsMCwxLC43NDEuNjM3LDEuODI0LDEuODI0LDAsMCwxLC4zLDEuMDg1LDEuOTQyLDEuOTQyLDAsMCwxLS4zMTcsMS4xMjQsMi4xNTUsMi4xNTUsMCwwLDEtLjc3My43LDEuODU4LDEuODU4LDAsMCwxLS44NTQuMjM2aC0yLjIwN3YtLjk3OWgxLjhhLjkzNy45MzcsMCwwLDAsLjU4NS0uMjcsMS4wMDksMS4wMDksMCwwLDAsLjMxNS0uODA5LjgxOS44MTksMCwwLDAtLjMxNS0uNzU0LDEuMDgzLDEuMDgzLDAsMCwwLS41NTEtLjJoLTEuMjU4VjI4LjFabTMuNjQ1LTIuODQ0LDEuNSwyLjg0NGgtMS40NTNsLTEuNDcxLTIuODQ0WiIgdHJhbnNmb3JtPSJ0cmFuc2xhdGUoNTcuOTQ0IC0xOC42MTIpIiBmaWxsPSIjMzMzIj48L3BhdGg+PC9nPjwvZz48L3N2Zz4g';
import type { Phase, RetainerOption, UpfrontItem } from '@/types/proposal';

interface TemplateSection {
  heading: string;
  body: string;
}

// Replace with a base64-encoded PNG data URI of Simon Jeavons' actual signature image.
// e.g. 'data:image/png;base64,iVBORw0KGgo...'
// When set, the image will appear in the Shoothill execution block of every contract.
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
            <View style={{ backgroundColor: '#F4F7FA', borderWidth: 0.5, borderColor: '#DDE8EE', height: 52, marginBottom: 6, justifyContent: 'center', alignItems: 'center' }}>
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
