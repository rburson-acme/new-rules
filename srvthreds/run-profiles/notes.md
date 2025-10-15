
configuration files

resolver_config is required to have an entry for each actual 'instance' of a service.  it is used to resolve addresses and allow for direct addressing to instances.

registry_config.json is used to enumerate services available to the user for pattern creation.  These may differ than those in resolver_config

engine - engine specific configuration

rascal_config - required for rascal and rabbitmq setup

sessions_model - specifies user groups

x_agent.conf - Configuration for a 'class' of agent (nodeId is added at runtime)

x_agent_meta.conf - specifies metadata for a service type

