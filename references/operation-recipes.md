# 常见 MCP 操作

示例位号、网络和坐标仅演示接口，执行前使用实际设计对象。正常请求只含 operations，坐标和尺寸默认 mil；需要毫米时显式传 units=mm。指定 target 仅在需要消除多 PCB 歧义时使用。路径由 AI 指定，MCP 不自动绕障。

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
            787.4,
            708.7
          ],
          "angle": 90,
          "side": "bottom"
        },
        {
          "ref": "R8",
          "at": [
            944.9,
            748
          ],
          "angle": 0
        }
      ]
    },
    {
      "op": "route",
      "layer": "bottom",
      "width": 9.8,
      "items": [
        {
          "from": "U1.12",
          "to": "R8.1",
          "through": [
            [
              866.1,
              708.7
            ],
            [
              905.5,
              748
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
      "width": 7.9,
      "items": [
        {
          "points": [
            [
              0,
              0
            ],
            [
              118.1,
              66.9
            ],
            [
              236.2,
              66.9
            ]
          ]
        },
        {
          "points": [
            [
              315,
              39.4
            ],
            [
              393.7,
              39.4
            ],
            [
              433.1,
              78.7
            ]
          ]
        }
      ]
    },
    {
      "op": "via",
      "positions": [
        [
          236.2,
          66.9
        ],
        [
          433.1,
          78.7
        ]
      ],
      "net": "SIG",
      "diameter": 23.6,
      "holeDiameter": 11.8
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
        "diameter": 1574.8
      }
    },
    {
      "op": "hole",
      "positions": [
        [
          393.7,
          393.7
        ],
        [
          -393.7,
          -393.7
        ]
      ],
      "diameter": 110.2
    },
    {
      "op": "hole",
      "positions": [
        [
          0,
          393.7
        ]
      ],
      "diameter": 78.7,
      "length": 196.9,
      "angle": 30
    },
    {
      "op": "region",
      "geometry": {
        "type": "circle",
        "center": [
          393.7,
          393.7
        ],
        "diameter": 236.2
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
          157.5,
          236.2
        ]
      },
      "hole": {
        "diameter": 78.7,
        "length": 157.5
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
            -78.7,
            -78.7
          ],
          [
            393.7,
            -78.7
          ],
          [
            393.7,
            78.7
          ],
          [
            -78.7,
            78.7
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
          -590.6,
          -590.6
        ],
        "size": [
          1181.1,
          1181.1
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
      "value": 196.9
    },
    {
      "op": "distribute",
      "refs": [
        "R1",
        "R2"
      ],
      "axis": "x",
      "start": 78.7,
      "spacing": 118.1
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
      "radius": 590.6,
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
        78.7,
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
        "width": 39.4
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
      "fontSize": 47.2,
      "width": 7.1,
      "items": [
        {
          "at": [
            196.9,
            196.9
          ],
          "text": "UART1"
        },
        {
          "at": [
            196.9,
            275.6
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
