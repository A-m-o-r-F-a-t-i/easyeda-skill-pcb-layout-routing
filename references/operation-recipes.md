# 常见 MCP 操作

示例位号、网络和坐标仅演示接口，执行前使用实际设计对象。正常请求只含 operations；默认 mm，指定 target 仅在需要消除多 PCB 歧义时使用。路径由 AI 指定，MCP 不自动绕障。

## 布局与同批实际引脚连线

```json
{
  "operations": [
    {
      "op": "place",
      "items": [
        {
          "ref": "U1",
          "at": [
            20,
            18
          ],
          "angle": 90,
          "side": "bottom"
        },
        {
          "ref": "R8",
          "at": [
            24,
            19
          ],
          "angle": 0
        }
      ]
    },
    {
      "op": "route",
      "layer": "bottom",
      "width": 0.25,
      "items": [
        {
          "from": "U1.12",
          "to": "R8.1",
          "through": [
            [
              22,
              18
            ],
            [
              23,
              19
            ]
          ]
        }
      ]
    }
  ],
  "view": "local"
}
```

## 批量完整路径与过孔

```json
{
  "operations": [
    {
      "op": "route",
      "net": "SIG",
      "layer": "top",
      "width": 0.2,
      "items": [
        {
          "points": [
            [
              0,
              0
            ],
            [
              3,
              1.7
            ],
            [
              6,
              1.7
            ]
          ]
        },
        {
          "points": [
            [
              8,
              1
            ],
            [
              10,
              1
            ],
            [
              11,
              2
            ]
          ]
        }
      ]
    },
    {
      "op": "via",
      "positions": [
        [
          6,
          1.7
        ],
        [
          11,
          2
        ]
      ],
      "net": "SIG",
      "diameter": 0.6,
      "holeDiameter": 0.3
    }
  ],
  "view": "none"
}
```

## 板框、孔、槽与原生禁止区域

```json
{
  "operations": [
    {
      "op": "outline",
      "geometry": {
        "type": "circle",
        "center": [
          0,
          0
        ],
        "diameter": 40
      }
    },
    {
      "op": "hole",
      "positions": [
        [
          10,
          10
        ],
        [
          -10,
          -10
        ]
      ],
      "diameter": 2.8
    },
    {
      "op": "hole",
      "positions": [
        [
          0,
          10
        ]
      ],
      "diameter": 2,
      "length": 5,
      "angle": 30
    },
    {
      "op": "region",
      "geometry": {
        "type": "circle",
        "center": [
          10,
          10
        ],
        "diameter": 6
      },
      "layer": "multi",
      "ruleTypes": [
        2,
        5,
        6,
        7,
        8
      ]
    }
  ],
  "view": "board"
}
```

## 带网络独立端子、局部铜与铺铜边界

```json
{
  "operations": [
    {
      "op": "pad",
      "at": [
        0,
        0
      ],
      "number": "OUT",
      "net": "OUT",
      "layer": "multi",
      "padShape": {
        "type": "oval",
        "size": [
          4,
          6
        ]
      },
      "hole": {
        "diameter": 2,
        "length": 4
      },
      "metallization": true
    },
    {
      "op": "fill",
      "net": "OUT",
      "layer": "top",
      "geometry": {
        "type": "polygon",
        "points": [
          [
            -2,
            -2
          ],
          [
            10,
            -2
          ],
          [
            10,
            2
          ],
          [
            -2,
            2
          ]
        ]
      }
    },
    {
      "op": "pour",
      "net": "GND",
      "layer": "bottom",
      "geometry": {
        "type": "rectangle",
        "at": [
          -15,
          -15
        ],
        "size": [
          30,
          30
        ]
      },
      "name": "GND_BOTTOM"
    }
  ]
}
```

## 机械排列与整体平移

```json
{
  "operations": [
    {
      "op": "align",
      "refs": [
        "R1",
        "R2"
      ],
      "axis": "y",
      "value": 5
    },
    {
      "op": "distribute",
      "refs": [
        "R1",
        "R2"
      ],
      "axis": "x",
      "start": 2,
      "spacing": 3
    },
    {
      "op": "radial",
      "refs": [
        "J1",
        "J2"
      ],
      "center": [
        0,
        0
      ],
      "radius": 15,
      "startAngle": 30,
      "stepAngle": 60,
      "orientationOffset": 90
    },
    {
      "op": "transform",
      "select": {
        "refs": [
          "R1",
          "R2"
        ]
      },
      "translate": [
        2,
        0
      ]
    }
  ]
}
```

## 局部修改、删除与真实文字

```json
{
  "operations": [
    {
      "op": "modify",
      "select": {
        "kind": "line",
        "net": "5V"
      },
      "set": {
        "width": 1
      }
    },
    {
      "op": "delete",
      "select": {
        "kind": "line",
        "ids": [
          "EXAMPLE_LINE_ID"
        ]
      }
    },
    {
      "op": "text",
      "layer": "top_silkscreen",
      "fontSize": 1.2,
      "width": 0.18,
      "items": [
        {
          "at": [
            5,
            5
          ],
          "text": "UART1"
        },
        {
          "at": [
            5,
            7
          ],
          "text": "5V TX RX GND"
        }
      ]
    },
    {
      "op": "cleanup",
      "refs": [
        "U1"
      ],
      "unlock": false,
      "hideDesignators": true
    }
  ],
  "view": "local"
}
```

位置与线路可以在同批提交，端点按前序编辑完成后的实际焊盘解析。同号多个物理焊盘时使用精确 pad ID。原生 REGION、局部重铺等行为受客户端实际实现影响，结果显示原生错误或实际影响，不静默替换设计。

铺铜边界之后按需要调用 pcb_rebuild_pours。普通保存可调用 pcb_save_and_drc(runDrc=false)，原生 DRC 按需调用；这些不构成每次编辑的固定后缀。

完整 schema 使用 pcb_read(kind=operations)，整板数据使用 kind=overview；view=none 适合连续编辑。修改与删除仅按所列对象执行，未填写字段保持原值。
