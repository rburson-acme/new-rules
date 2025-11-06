# Azure Resource Naming Convention - Army NETCOM Standards

## Overview

There are no policy restrictions on naming Azure resources in cARMY except for those deployed as common services, to include virtual networks. Tenants may define a naming convention to fit their needs within the bounds of NETCOM Naming Convention Policy.

However, each resource has different limitations on length, valid characters, and uniqueness. Please review the [Naming rules and restrictions for Azure resources](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules) when defining your naming convention.

## Azure Resource Naming Standards

| Resource Type | Naming Pattern | Max Length | Allowed Characters | Uniqueness Scope |
|--------------|----------------|------------|-------------------|------------------|
| **Subscription** | MACOM-UNIT-APPNAME-ENV | - | - | - |
| **Resource Group** | CAZ-APPNAME-ENV-REGION-FUNCTION | 64 | a-z, A-Z, 0-9, - | Subscription |
| **Virtual Network** | CAZ-APPNAME-ENV-REGION-NET-VNET | 64 | a-z, A-Z, 0-9, - | Subscription |
| **Storage Account** | cazappnameenvregionstgfunction | 24 | a-z, 0-9 (no hyphens) | Global |
| **Key Vault** | CAZ-APPNAME-ENV-REGION-KEY-FUNCTION | 24 | a-z, A-Z, 0-9, - | Global |
| **App Service** | CAZ-APPNAME-ENV-REGION-APP-FUNCTION | 64 | a-z, A-Z, 0-9, - | Global |
| **Azure SQL Server** | caz-appname-env-region-sql-function | 64 | a-z, 0-9, - | Global |
| **SQL Managed Instance** | CAZ-APPNAME-ENV-REGION-SMI-FUNCTION | 64 | a-z, A-Z, 0-9, - | Global |
| **App Registration** | APP-APPNAME-ENV-FUNCTION | 64 | a-z, A-Z, 0-9, - | Azure AD |
| **User Service Account (AD)** | SVC-APPNAME-ENV-FUNCTION | 20 | a-z, A-Z, 0-9, - | Active Directory |
| **Group Managed Service Account (AD)** | SVCAPPNAME-ENV-FUNCTION | 15 | a-z, A-Z, 0-9, - | Active Directory |

### Region Codes

**Note**: The character designating REGION above shall be:
- **"E"** to denote the Azure Gov Virginia region
- **"W"** to denote Azure Gov Arizona region

---

## Virtual Machine Naming Convention

### Requirements

All computer objects registered in DNS and Active Directory must conform to **RFC 1035** standards:
- **Standard Internet characters**: A-Z and 0-9 only
- **No special characters**: No underscores, blank spaces, or periods permitted
- **Uniqueness**: Computer Object names must be unique throughout the Army Enterprise
- **Length limit**: 15 characters maximum (to conform to Windows NetBIOS naming requirements)

### Naming Rules

Army sites that administer computer objects in Active Directory must follow the naming guidance provided in this section:
- Computer object names will **NOT** consist of IP addresses (either in part or in whole)
- This requirement meets network security requirements under the Army's Installation Information Infrastructure Modernization Program (I3MP) Migration Plan

### VM Naming Format

The following naming standards format applies to all Computer Objects:

| Component | Length | Values | Customizable | Description |
|-----------|--------|--------|--------------|-------------|
| **Location** | 2 chars | CA (cARMY) | No | Fixed location code |
| **CSP** | 1 char | Z (Azure Unclass)<br>S (Azure SIPR) | No | Cloud Service Provider type |
| **Project** | 1 char | 0-9, a-Z | Assigned | Project identifier |
| **UIC** | 6 chars | W_____ | Assigned | Unit Identification Code |
| **Function** | 2 chars | See Function Codes below | Limited | Server role/function |
| **Environment** | 1 char | P/T/D or other | Yes | Environment (Prod/Test/Dev) |
| **Ordinal** | 2 chars | 0-9, a-Z | Yes | Sequential number |

### Example VM Names

**Sample Application Server**: `CAZAW123AAA0P01`

Breakdown:
- **CA**: cARMY location
- **Z**: Azure Unclassified
- **A**: Project code
- **W123AA**: UIC
- **A0**: Application Server function
- **P**: Production environment
- **01**: First instance

### Critical Warning

⚠️ **DO NOT** begin a VM name with the characters **"CAZZ"**
- This enables an ECMA debugging feature to bypass naming convention policy
- Allows VM names to be set that do not comply with NETCOM naming conventions
- **Any VMs found to be non-compliant will be disabled**

---

## Function Codes

### Overview

The Primary Function Codes identify the function of the Computer Object's role within Active Directory (AD) across all of the Army's Enterprise Networks of all classifications, including strategic and tactical.

**Purpose**: These codes assist enterprise asset managers and system owners in readily identifying assets and evaluating network anomalies.

**Management**: The U.S. Army Network Enterprise Technology Command (NETCOM), G-3/5 Future Operations (FUOPS), Identity and Access Management (IdAM) team will manage and update this convention to conform to changes in policies and procedures or if a new code is added or phased out.

### Standard Function Codes

| Code | Server Role | Description |
|------|-------------|-------------|
| **A0** | Application Server | Server program providing business logic for an application. Part of a three-tier application: GUI server, application (business logic) server, and database/transaction server. |
| **A1** | Domain Controller | Responds to security authentication requests, stores user account information, authenticates users, enforces security policy, and replicates to other domain controllers. |
| **A4** | Database Server | Key component in client/server environment. Holds database management system and databases. Searches database for selected records upon client requests. |
| **A6** | DNS Server | Internet service that translates domain names into IP addresses. Translates fully qualified domain names into corresponding IP addresses. |
| **A7** | File Server | Provides central storage and management of data files accessible to network workstations. Stores documents, sound files, photographs, movies, images, databases, etc. |
| **AD** | ADFS Server | AD Services component providing single sign-on access across organizational boundaries using claims-based access-control authorization model. |
| **B6** | Security Server | Web server guaranteeing secure online transactions using SSL protocol. Provides network security perimeter (e.g., Reverse/Forward proxy server, Bluecoat appliance). |
| **B7** | System Management Server | Microsoft tools for managing PCs on LAN. Provides remote control, patch management, software distribution, hardware/software inventory. |
| **C2** | Web Server | Delivers web pages to browsers via HTTP. Includes hardware, OS, web server software, TCP/IP protocols, and site content. May be called "intranet server" for internal use. |
| **C9** | OCSP Server | Protocol for maintaining server/network resource security. Verifies X.509 digital certificate revocation status and public key infrastructure certificates. |
| **DF** | DFS Server | Builds hierarchical view of multiple files and shares information on the network. Provides single namespace for distributed file shares. |
| **F2** | SMTP Relay Server | Routes SMTP messages in and out of the Exchange enterprise. |
| **FW** | Firewall | Router/access server designated as buffer between public and private networks. Uses access lists and policy rules for security. |
| **G0** | SCCM Central Admin Site (CAS) | Coordinates management and inter-site data replication across hierarchy using Configuration Manager Database replication. |
| **G2** | SCCM Server | Manages policy and controls content distribution for clients. |
| **GS** | GIS Server | Geographic Information System designed to capture, store, manipulate, analyze, manage, and present spatial/geographic data. |
| **M2** | AD Lightweight Directory Services | Independent mode of AD providing dedicated directory services for applications (minus infrastructure features). |
| **N0** | ACAS Server | IA Main Console providing system console access via networking. Provides policy instructions to network monitor agents for real-time traffic monitoring. |
| **N1** | ACAS Scanner | Remote security scanning tool that scans computers and alerts on vulnerabilities that could be exploited by malicious hackers. |
| **N2** | ACAS Network Monitor Agent | Receives scanning instructions from console, performs local scans, reports vulnerability/compliance results back to Network Manager. |
| **PM** | Project Management Server | Microsoft Project Server storing project information in central SQL database. Communicates status/changes, stores calendars and timelines. |
| **PX** | Proxy Server | Processes, filters, and directs IP packets. Decides which protocols/services to serve from cache. Caches HTTP, HTTPS, FTP, streaming content. |
| **RM** | Records Management System | Electronic document and Records Management System for tracking and storing business documents and records. |
| **SD** | SharePoint Database Server | Database file storing content for SharePoint site collections (web pages, files, documents, images, etc.). |

---

## Additional Resources

- [Azure Naming Rules and Restrictions](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules)
- NETCOM Naming Convention Policy (internal)
- Army I3MP Migration Plan (internal)

---

**Last Updated**: 2025-01-06
**Source**: Army NETCOM Naming Convention Policy
**Maintained By**: U.S. Army NETCOM G-3/5 FUOPS IdAM Team