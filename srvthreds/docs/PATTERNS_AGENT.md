# Pattern Reference (AI Agent)

## Quick Reference
Pattern = JSON workflow definition. Thred = running pattern instance. Reaction = state. Event = trigger. State persists in Redis with per-thredId locking.

## SystemSpec - Context for Pattern Creation

The **SystemSpec** provides essential context for creating patterns. It defines:
1. **Available services** - their addresses, input formats (for tasks), and output formats (for handling responses)
2. **Participant addresses** - individual participants and groups for the `publish.to` field

When creating patterns, reference the SystemSpec to:
- Know which service addresses to use in `publish.to`
- Understand required task structures for service inputs
- Know what event types and data structures services return
- Identify available participant IDs and groups

### SystemSpec Structure
```json
{
  "serviceSpecs": [],   // Available services with I/O definitions
  "addressSpec": {
    "participants": [], // Individual addressable participants
    "groups": []        // Named groups of participants
  }
}
```

### AddressSpec - Participants and Groups
Defines who can receive events via `publish.to`:

```json
{
  "addressSpec": {
    "participants": [
      {"id": "participant0", "name": "Participant 0", "uri": "..."},
      {"id": "participant1", "name": "Participant 1"}
    ],
    "groups": [
      {
        "name": "approvers",
        "participants": [
          {"participantId": "participant0"},
          {"participantId": "participant1"}
        ]
      }
    ]
  }
}
```

**Usage in patterns:**
- Direct: `"publish": {"to": "participant0"}`
- Group: `"publish": {"to": "$approvers"}` (expands to all members)
- Multiple: `"publish": {"to": ["participant0", "participant1"]}`

### ServiceSpec - Service Definitions
Each service defines its address, accepted inputs, and output event formats:

```json
{
  "name": "Persistent Storage",
  "nodeType": "org.wt.persistence",
  "address": "org.wt.persistence",
  "description": "CRUD operations for data storage",
  "entitySpecs": [...],   // Data structure definitions
  "inputSpecs": [...],    // What the service accepts (tasks)
  "outputSpecs": [...]    // What the service returns (events)
}
```

**Service address usage:** `"publish": {"to": "org.wt.persistence"}`

### EntityTypeSpec - Data Structures
Defines the structure of data entities used in inputs and outputs:

```json
{
  "type": "TestObject",
  "description": "A test record",
  "propertySpecs": [
    {"name": "id", "type": "string", "description": "Unique ID", "readonly": true},
    {"name": "status", "type": "string", "description": "Current status"},
    {"name": "count", "type": "number", "description": "Item count"},
    {"name": "metadata", "type": "object", "description": "Additional data",
      "propertySpec": [
        {"name": "created", "type": "Date", "description": "Creation timestamp"}
      ]
    }
  ]
}
```

**Property types:** `string`, `number`, `boolean`, `Date`, `object`, `array`

### InputSpec - Service Input Format (Tasks)
Defines what task operations a service accepts and which entity types:

```json
{
  "inputSpecs": [{
    "inputContentType": "tasks",
    "inputContentSpec": {
      "description": "CRUD operations on TestObject",
      "entityTypeName": "TestObject",
      "allowedOps": ["put", "get", "getOne", "update", "delete"],
      "options": [
        {"name": "dbname", "type": "string", "description": "Database name"}
      ]
    }
  }]
}
```

**Building tasks from InputSpec:**
```json
{
  "transform": {
    "eventDataTemplate": {
      "content": {
        "tasks": [{
          "op": "put",
          "params": {
            "type": "TestObject",
            "values": {
              "id": "$xpr($valueNamed('id'))",
              "status": "active"
            }
          }
        }]
      }
    }
  },
  "publish": {"to": "org.wt.persistence"}
}
```

### OutputSpec - Service Output Format
Defines event types and data structures returned by services:

```json
{
  "outputSpecs": [{
    "eventType": "org.wt.persistence",
    "description": "Query results or operation confirmations",
    "eventContentType": "values",
    "eventContentSpecs": [
      {"entityTypeName": "TestObject"}
    ]
  }]
}
```

**Handling service responses:**
- Filter on event type: `"xpr": "$event.type = 'org.wt.persistence'"`
- Access returned values: `$valueNamed('id')`, `$valueNamed('status')`
- Access full values object: `$values` or `$content.values`

### Complete Example: Using SystemSpec in Pattern

Given this SystemSpec excerpt:
```json
{
  "addressSpec": {
    "participants": [{"id": "requester"}, {"id": "admin"}],
    "groups": [{"name": "admins", "participants": [{"participantId": "admin"}]}]
  },
  "serviceSpecs": [{
    "name": "Storage",
    "address": "org.wt.persistence",
    "entitySpecs": [{
      "type": "Record",
      "propertySpecs": [
        {"name": "id", "type": "string"},
        {"name": "data", "type": "string"}
      ]
    }],
    "inputSpecs": [{
      "inputContentType": "tasks",
      "inputContentSpec": {"entityTypeName": "Record", "allowedOps": ["put", "get"]}
    }],
    "outputSpecs": [{
      "eventType": "org.wt.persistence",
      "eventContentSpecs": [{"entityTypeName": "Record"}]
    }]
  }]
}
```

Pattern using this context:
```json
{
  "name": "StoreAndNotify",
  "reactions": [
    {
      "name": "store",
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'store.request'",
        "onTrue": {"xpr": "$setLocal('requester', $event.source.id)"},
        "transform": {
          "eventDataTemplate": {
            "content": {
              "tasks": [{
                "op": "put",
                "params": {
                  "type": "Record",
                  "values": {
                    "id": "$xpr($valueNamed('id'))",
                    "data": "$xpr($valueNamed('data'))"
                  }
                }
              }]
            }
          }
        },
        "publish": {"to": "org.wt.persistence"}
      }
    },
    {
      "name": "notify",
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'org.wt.persistence'",
        "transform": {
          "eventDataTemplate": {
            "title": "Record stored",
            "content": {"values": {"recordId": "$xpr($valueNamed('id'))"}}
          }
        },
        "publish": {"to": "$admins"},
        "transition": {"name": "$terminate"}
      }
    }
  ]
}
```

### SystemSpec Usage Summary

| Pattern Element | SystemSpec Source | Example |
|-----------------|-------------------|---------|
| `publish.to` (service) | `serviceSpec.address` | `"org.wt.persistence"` |
| `publish.to` (participant) | `addressSpec.participants[].id` | `"participant0"` |
| `publish.to` (group) | `addressSpec.groups[].name` | `"$approvers"` |
| `task.op` | `inputSpec.allowedOps` | `"put"`, `"get"`, `"update"` |
| `task.params.type` | `entitySpec.type` | `"TestObject"` |
| `task.params.values` | `entitySpec.propertySpecs` | Field names and types |
| Filter `$event.type` | `outputSpec.eventType` | `"org.wt.persistence"` |
| Response values | `outputSpec.entityTypeName` → `entitySpec` | `$valueNamed('field')` |

## Pattern Root
```json
{
  "name": "string (required)",
  "id": "string (optional, derived from name)",
  "description": "string (optional)",
  "instanceInterval": 0,  // ms between thred creation
  "maxInstances": 0,      // concurrent limit (0=unlimited)
  "broadcastAllowed": false,  // enable broadcast events
  "echoResponses": false,
  "reactions": []  // required array
}
```

## Reactions
```json
{
  "name": "string (optional, auto-generated)",
  "description": "string (optional)",
  "allowedSources": "string|array (optional)",  // authorization
  "permissions": {},  // optional, not fully implemented
  "expiry": {
    "interval": 60000,  // ms
    "transition": {"name": "reaction_name"}  // optional
  },
  "condition": {}  // required
}
```

**allowedSources Matching:**
- Exact: `"participant_id"` or `["id1", "id2"]`
- Group: `"$groupName"` (from sessions_model.json)
- Regex: `"/pattern.*/"`  (case-insensitive, gi flags)
- If not specified, all sources allowed

## Conditions

### Filter
```json
{
  "type": "filter",
  "xpr": "JSONata boolean expression",
  "description": "string (optional)",
  "onTrue": {"xpr": "side effect expression"},  // optional
  "transform": {},  // optional
  "publish": {},    // optional
  "transition": {}  // optional
}
```

### And (all operands must match, state persisted)
```json
{
  "type": "and",
  "description": "string (optional)",
  "operands": [{"type": "filter|and|or", ...}],
  "publish": {},    // optional
  "transition": {}  // optional
}
```

### Or (first match wins)
```json
{
  "type": "or",
  "description": "string (optional)",
  "operands": [{"type": "filter|and|or", ...}]
}
```

**Rule:** Deepest transform/publish/transition wins. Avoid onTrue side effects in first reaction (runs during pattern matching).

**Divergent Behaviors:** When each OR operand should trigger different actions (different transforms, publish targets, or transitions), place all directives (onTrue, transform, publish, transition) within each operand. The first matching operand's directives will execute. If operands share the same behavior, directives can be at the parent OR level.

## Transforms
```json
{
  "name": "string (optional)",  // for $isResponseFor() matching
  "description": "string (optional)",
  "eventDataTemplate": {  // option 1
    "title": "string|$xpr(...)",
    "description": "string|$xpr(...)",
    "display": {"uri": "string|$xpr(...)"},
    "advice": {
      "eventType": "string",
      "title": "string",
      "template": {}  // see Interaction Templates
    },
    "content": {
      "values": {},
      "valuesType": "string",
      "tasks": [],  // see Event Tasks
      "items": [],
      "resources": [],
      "error": {"message": "string", "code": 0}
    }
  },
  "templateXpr": "JSONata returning complete EventData",  // option 2
  "meta": {
    "reXpr": "$event.id"  // reply-to field
  }
}
```

**Transform `name` and Response Matching:**
The optional `name` parameter allows you to identify which outbound event a subsequent inbound event is responding to. When a named transform creates an outbound event, the system stores the event ID. Use `$isResponseFor('transformName')` in subsequent reactions to check if an incoming event is a response to that specific outbound event.

**When to use:** This feature is only necessary when multiple outbound events may be in flight simultaneously and responses from the same source need to be distinguished. For example, if a pattern sends requests to the same service (e.g., persistence) from different reactions, and multiple responses could arrive, `$isResponseFor()` ensures each response is routed to the correct handler. If your pattern only has one outstanding request at a time, simple event type filtering (e.g., `$event.type = 'org.wt.persistence'`) is sufficient.

**Example: Named Transforms with Response Matching**
```json
{
  "reactions": [
    {
      "name": "send_requests",
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'start'",
        "transform": {
          "name": "save_data",  // Name the transform
          "eventDataTemplate": {
            "content": {"tasks": [{"op": "put", "params": {"type": "Record", "values": {}}}]}
          }
        },
        "publish": {"to": "org.wt.persistence"}
      }
    },
    {
      "name": "handle_save_response",
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'org.wt.persistence' and $isResponseFor('save_data')",
        "transform": {"eventDataTemplate": {"title": "Save completed"}},
        "publish": {"to": "requester"},
        "transition": {"name": "$terminate"}
      }
    }
  ]
}
```

## Publish
```json
{
  "description": "string (optional)",
  "to": "string|array",  // participant IDs, $groups, agents, or $xpr(...)
  "onPublish": {"xpr": "expression"}  // optional, runs with outbound event
}
```

**Address Resolution:** Direct IDs → pass through, $groups → expand to members, expressions → evaluate, arrays → flatten.

## Transitions
```json
{
  "name": "reaction_name|$next|$terminate|$noTransition",
  "input": "default|forward|local",  // optional
  "localName": "var_name",  // required if input=local
  "description": "string (optional)"
}
```

**Input Types:**
- `default`: wait for next event (dormant)
- `forward`: immediately process current event in next reaction
- `local`: use stored event from $local(localName)

**Default:** If no transition specified, goes to next reaction or terminates.

## JSONata Expressions

**Syntax:**
- In filters: `"xpr": "expression"`
- In templates: `"field": "$xpr( expression )"` or `{"$xpr": "expression"}`

**Bindings:**
- `$event` - complete event
- `$thredId` - current thred ID
- `$data` - event.data
- `$content` - event.data.content
- `$values` - event.data.content.values
- `$advice` - event.data.advice
- `$valueNamed(name)` - get value from event
- `$local(name)` - get from local storage
- `$setLocal(name, value)` - store in local storage (persisted to Redis)
- `$isResponseFor(transformName)` - returns true if inbound event is a response to the named transform's outbound event

**Important**
- When targeting specific values (key names) in the event payload values object, using the $valueNamed(name) operator is often the best approach.  It will search all arrays and objects in a depth-first search until it encounters the key/value you've specificed in $valueNamed(name). It will return the first occurance that it encounters.  This is often a better approach than trying to accurately predict the returned object and array structure.

**Operators:** `=` `!=` `>` `<` `>=` `<=` `and` `or` `not()` `&` (concat) `+` `-` `*` `/` `%` `$count()` `$exists()` `$millis()` `$now()` array[index]

## Event Tasks (Platform-Agnostic)

```json
{
  "content": {
    "tasks": [{
      "name": "string (optional)",
      "op": "put|getOne|get|update|upsert|replace|delete|count|run",
      "options": {},  // implementation-specific
      "params": {
        "type": "string (required)",  // collection/entity type
        "matcher": {},   // query for update/delete/get
        "selector": {"include": [], "exclude": []},  // field selection
        "collector": {"limit": 0, "skip": 0, "sort": [{"field": "name", "desc": false}]},
        "values": {}     // data for create/update
      }
    }]
  }
}
```

**Update Operators (Generic → Translated):**
- `$add` - add to set (unique)
- `$push` - append to array
- `$remove` - remove from array
- `$now` - current timestamp
- `$inc` - increment
- `$min` - minimum value
- `$max` - maximum value
- `$mul` - multiply

**Match Operators (Generic → Translated):**
- `$gte` `$gt` `$lte` `$lt` `$ne` - comparison
- `$in` `$nin` - array membership
- `$or` `$not` - logical
- `$re` - regex match

**Translation:** Generic operators auto-translated by persistence layer (e.g., `$add`→`$addToSet` in MongoDB, `$remove`→`$pull`, `$now`→`$currentDate`, `$re`→`$regex`). Regular fields wrapped in `$set` automatically.

**Example:**
```json
{"values": {"status": "active", "$push": {"tags": "new"}, "$inc": {"count": 1}}}
```

## Interaction Templates

```json
{
  "advice": {
    "eventType": "response.type",
    "title": "string",
    "template": {
      "name": "string",
      "interactions": [{
        "interaction": {
          "content": [
            {"text": {"value": "string|$xpr(...)"}},
            {"input": {
              "type": "boolean|numeric|text|nominal",
              "name": "field_name",
              "display": "prompt",
              "multiple": false,  // for nominal
              "set": [{"display": "label", "value": val}]  // for boolean/nominal
            }},
            {"map": {"locations": [{"name": "str", "latitude": "$xpr(...)", "longitude": "$xpr(...)", "display": "uri"}]}},
            {"image": {"uri": "string", "width": 0, "height": 0}},
            {"video": {"uri": "string|$xpr(...)"}},
            {"group": {"items": []}}
          ]
        }
      }]
    }
  }
}
```

**Access Response:** `$valueNamed('field_name')` in subsequent reactions.

## Workflow Patterns

**Request/Response:**
```
Event → Send Request → Wait Response → Process → Terminate
```

**Approval:**
```
Request → Notify Approver → Wait → [Approve|Reject] → Process|Terminate
```

**Multi-Approval (And):**
```
Request → Notify All → Wait for All → Process → Terminate
```

**Branching (Or):**
```
Event → Decision → [Path A|B|C] → Continue|Terminate
```

**Timeout:**
```
Send → Wait with Expiry → [Response|Timeout] → Handle
```

**Multi-Step (Forward):**
```
Step1 → Step2 (input:forward) → Step3 (input:forward) → Terminate
```

**Cleanup with Confirmation:**
```
Operation → Send Results → Cleanup (input:forward) → Wait Confirmation → Terminate
```

**Sequential Operations with Notifications:**
```
Store Data → Notify Participant → Wait for Finish Signal → Retrieve Data → Send Results → Cleanup → Wait Confirmation → Terminate
```

## Pattern Generation Steps

1. **Identify reactions** from workflow steps
2. **Define conditions** (event type, data requirements, auth)
3. **Identify state storage** ($setLocal for important data)
4. **Design transforms** (eventDataTemplate with $xpr)
5. **Specify recipients** (to: participant IDs, $groups, agents, $xpr)
6. **Define transitions** (name, input type, localName if needed)

## Validation Checklist
- [ ] Pattern has name, reactions array
- [ ] First reaction matches initial event
- [ ] Each reaction has condition with type
- [ ] Filter conditions have xpr
- [ ] And/Or conditions have operands
- [ ] Transforms have eventDataTemplate or templateXpr
- [ ] Publish has to field
- [ ] Transitions reference valid reactions or $next/$terminate/$noTransition
- [ ] Local vars set before use
- [ ] Workflow has termination conditions
- [ ] JSONata syntax valid
- [ ] $xpr() properly formatted
- [ ] Service addresses match SystemSpec serviceSpecs[].address
- [ ] Participant/group addresses match SystemSpec addressSpec
- [ ] Task operations match InputSpec allowedOps
- [ ] Task params.type matches EntityTypeSpec type
- [ ] Task params.values fields match EntityTypeSpec propertySpecs
- [ ] Filter event types match OutputSpec eventType for service responses

## Common Errors
1. Trying to create multiple different events in one reaction (use sequential reactions with transitions instead)
2. Missing initial reaction for trigger event
3. Undefined transition targets
4. Using $local() without $setLocal()
5. onTrue in first reaction (side effects during matching)
6. Missing required fields (condition.type, condition.xpr, publish.to)
7. input:local without localName
8. No termination path
9. Circular transitions without exit
10. Invalid service address (must match SystemSpec serviceSpec.address)
11. Task operation not in service's allowedOps
12. Task params.type not matching service's entityTypeName
13. Filtering on wrong event type for service responses
14. Missing or misnamed fields in task values (must match EntityTypeSpec propertySpecs)
15. Using `$isResponseFor('name')` without naming the transform (transform must have `"name": "name"` property)

## Complete Minimal Examples

**Simple Notify:**
```json
{
  "name": "Notify",
  "reactions": [{
    "condition": {
      "type": "filter",
      "xpr": "$event.type = 'trigger'",
      "transform": {"eventDataTemplate": {"title": "Alert"}},
      "publish": {"to": "user1"},
      "transition": {"name": "$terminate"}
    }
  }]
}
```

**Approval Flow:**
```json
{
  "name": "Approval",
  "reactions": [
    {
      "name": "request",
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'request'",
        "onTrue": {"xpr": "$setLocal('req', $event)"},
        "transform": {
          "eventDataTemplate": {
            "title": "Approve?",
            "advice": {
              "eventType": "response",
              "template": {
                "name": "form",
                "interactions": [{"interaction": {"content": [
                  {"input": {"type": "boolean", "name": "approved", "display": "Approve?", "set": [{"display": "Yes", "value": true}, {"display": "No", "value": false}]}}
                ]}}]
              }
            }
          }
        },
        "publish": {"to": "approver"}
      }
    },
    {
      "name": "handle",
      "condition": {
        "type": "or",
        "operands": [
          {
            "type": "filter",
            "xpr": "$valueNamed('approved') = true",
            "transform": {"eventDataTemplate": {"title": "Approved"}},
            "transition": {"name": "$terminate"}
          },
          {
            "type": "filter",
            "xpr": "$valueNamed('approved') = false",
            "transform": {"eventDataTemplate": {"title": "Rejected"}},
            "transition": {"name": "$terminate"}
          }
        ],
        "publish": {"to": "$xpr($local('req').source.id)"}
      }
    }
  ]
}
```

**Multi-Approval (And):**
```json
{
  "name": "DualApproval",
  "reactions": [
    {
      "name": "request",
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'request'",
        "transform": {
          "eventDataTemplate": {
            "title": "Approval Needed",
            "advice": {"eventType": "response", "template": {"name": "form", "interactions": [{"interaction": {"content": [{"input": {"type": "boolean", "name": "approved", "display": "Approve?", "set": [{"display": "Yes", "value": true}, {"display": "No", "value": false}]}}]}}]}}
          }
        },
        "publish": {"to": ["manager", "director"]}
      }
    },
    {
      "name": "collect",
      "condition": {
        "type": "and",
        "operands": [
          {"type": "filter", "xpr": "$event.source.id = 'manager' and $valueNamed('approved') = true"},
          {"type": "filter", "xpr": "$event.source.id = 'director' and $valueNamed('approved') = true", "transform": {"eventDataTemplate": {"title": "Both Approved"}}, "publish": {"to": "processor"}, "transition": {"name": "$terminate"}}
        ]
      }
    }
  ]
}
```

**With Tasks:**
```json
{
  "name": "CreateRecord",
  "reactions": [{
    "condition": {
      "type": "filter",
      "xpr": "$event.type = 'create'",
      "onTrue": {"xpr": "$setLocal('data', {'id': $valueNamed('id'), 'name': $valueNamed('name')})"},
      "transform": {
        "eventDataTemplate": {
          "title": "Creating",
          "content": {
            "tasks": [{
              "name": "create",
              "op": "put",
              "params": {
                "type": "records",
                "values": {
                  "id": "$xpr($local('data').id)",
                  "name": "$xpr($local('data').name)",
                  "created": "$xpr($millis())"
                }
              }
            }]
          }
        }
      },
      "publish": {"to": "org.wt.persistence"},
      "transition": {"name": "$terminate"}
    }
  }]
}
```

**With Update Operators:**
```json
{
  "name": "UpdateRecord",
  "reactions": [{
    "condition": {
      "type": "filter",
      "xpr": "$event.type = 'update'",
      "transform": {
        "eventDataTemplate": {
          "content": {
            "tasks": [{
              "op": "update",
              "params": {
                "type": "records",
                "matcher": {"id": "$xpr($valueNamed('id'))"},
                "values": {
                  "status": "active",
                  "$push": {"history": {"timestamp": "$xpr($millis())", "action": "updated"}},
                  "$inc": {"updateCount": 1},
                  "$now": {"modified": true},
                  "$add": {"tags": "$xpr($valueNamed('newTag'))"}
                }
              }
            }]
          }
        }
      },
      "publish": {"to": "org.wt.persistence"},
      "transition": {"name": "$terminate"}
    }
  }]
}
```

**With Expiry:**
```json
{
  "name": "Timeout",
  "reactions": [
    {
      "name": "send",
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'request'",
        "transform": {"eventDataTemplate": {"title": "Respond", "advice": {"eventType": "response", "template": {"name": "form", "interactions": [{"interaction": {"content": [{"input": {"type": "text", "name": "answer", "display": "Answer:"}}]}}]}}}},
        "publish": {"to": "user1"}
      }
    },
    {
      "name": "wait",
      "expiry": {"interval": 30000, "transition": {"name": "timeout"}},
      "condition": {
        "type": "filter",
        "xpr": "$event.type = 'response'",
        "transform": {"eventDataTemplate": {"title": "Received"}},
        "publish": {"to": "admin"},
        "transition": {"name": "$terminate"}
      }
    },
    {
      "name": "timeout",
      "condition": {
        "type": "filter",
        "xpr": "true",
        "transform": {"eventDataTemplate": {"title": "Timeout"}},
        "publish": {"to": "admin"},
        "transition": {"name": "$terminate"}
      }
    }
  ]
}
```

## Key Rules
- **ONE EVENT PER REACTION** - A reaction can only create ONE outbound event. You cannot publish different event types to multiple recipients with different transforms in a single reaction. To send multiple different events, chain reactions sequentially using transitions.
- **SystemSpec is your context** - Always reference SystemSpec for service addresses, participant IDs, groups, task structures, and response formats
- **Unbound event** (no thredId) → pattern matching → creates Thred
- **Bound event** (has thredId) → routes to existing Thred
- **First reaction** = entry point, avoid onTrue side effects
- **State persists** in Redis with per-thredId locking
- **Local storage** survives restarts, accessible via $local()/$setLocal()
- **And conditions** maintain state across events until all match
- **Or conditions** first match wins, operand directives override parent
- **Transitions** default to $next if not specified
- **Tasks use generic operators** translated to platform-specific (MongoDB, etc.)
- **allowedSources** checked before condition evaluation
- **Groups** defined in sessions_model.json, referenced as $groupName
- **Agents** addressed as org.domain.agent
- **JSONata** `$xpr()` for inline strings, `{"$xpr": "..."}` for object spreading
- **Regular fields** in task values auto-wrapped in $set equivalent
- **Schema** at ../thredlib/src/schemas/patternModel.json
- **Multiple patterns** can match same unbound event, all create Threds
- **Reactions auto-named** as {patternName}_{index} if name not provided
- **Broadcast** requires broadcastAllowed:true in pattern
- **Per-instance isolation** - Use `$event.thredId` as document ID when each thred needs its own data (e.g., `"matcher": {"id": "$xpr($event.thredId)"}`)
- **Cleanup confirmation** - When performing critical operations (delete, cleanup), wait for persistence response before terminating to ensure completion
- **Response correlation** - Use transform `name` with `$isResponseFor('transformName')` to match responses to specific outbound requests when multiple requests are in flight

## Schema Compliance
Pattern must validate against ../thredlib/src/schemas/patternModel.json. Critical fields: name (string), reactions (array of ReactionModel), each reaction has condition (ConditionModel) with type (filter|and|or) and type-specific requirements.

**Related Schemas:**
- **Pattern schema:** ../thredlib/src/schemas/patternModel.json
- **Event schema:** ../thredlib/src/schemas/event.json
- **SystemSpec schema:** ../thredlib/src/schemas/systemSpec.json

**SystemSpec TypeScript interfaces:** ../thredlib/meta/SystemSpec.ts, ServiceSpec.ts, EntityTypeSpec.ts, InputSpec.ts, OutputSpec.ts, PropertySpec.ts
