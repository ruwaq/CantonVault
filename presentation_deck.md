# CantonVault — Presentación Mapeada al Formato Yanapa (7 Diapositivas)

Este documento contiene el contenido exacto estructurado para encajar en las **7 diapositivas** del formato de tu proyecto anterior (Yanapa), manteniendo la misma distribución de bloques, columnas, números y alineaciones visuales para que puedas trasladarlo directamente a tu plantilla en Canva.

---

## 🖼️ Diapositiva 1: Portada (Cover)
*Mantiene la misma estructura de franja de gradiente izquierda, texto principal, subtítulo en el gradiente y máscara (reemplazada por tu nueva imagen de CantonVault).*

*   **Título Principal (Top Left)**: `CANTON VAULT`
*   **Subtítulo (Middle Left)**: `PRIVACY-FIRST CONDITIONAL COMMITMENTS FOR INSTITUTIONAL TRADE FINANCE.`
*   **Texto en la Franja del Gradiente (Left Column)**:
    ```text
    A selective disclosure
    primitive to prove
    conditional agreements,
    enforce atomic settlement,
    and guarantee
    on-ledger privacy.
    ```
*   **Autor (Bottom Left)**:
    ```text
    Ande
    Spain
    ```
*   **Imagen (Right Side)**: Reemplazar la máscara de Yanapa por tu nueva imagen: **cantonvault_logo.jpg** (guardada en la raíz del proyecto).

---

## 🏛️ Diapositiva 2: Introducción al Dolor (The Pain Point)
*Mantiene la tipografía con fondo destacado en el título superior, el párrafo centrado y el párrafo final de dos columnas con el sol de fondo en la esquina inferior izquierda.*

*   **Título Superior**: `THE COST OF FORCED TRANSPARENCY`
*   **Subtítulo con Fondo Destacado**: `CONFIDENTIALITY IS A REQUIREMENT`
*   **Párrafo Principal (Central)**:
    ```text
    Current financial networks bring no default confidentiality. For institutions trading 
    high volumes, exposing sensitive positions or factoring relationships is a commercial 
    barrier they cannot cross without facing market damage.
    ```
*   **Párrafo de Impacto (Bottom)**:
    ```text
    Imagine negotiating an OTC block trade that determines your portfolio's pricing, 
    or financing invoices for cash flow, but you are forced to expose details to competitors. 
    For millions in global trade, this "forced transparency" generates adverse pricing 
    pressure and severe double-factoring risks.
    ```
*   **Visual**: Mantener el sol decorativo en la parte inferior izquierda (o cambiarlo por un icono corporativo/candado minimalista en Canva).

---

## 📊 Diapositiva 3: La Brecha del Mercado (The Gap)
*Mantiene la estructura dividida a la mitad: texto estratégico a la izquierda con fondo oscuro/cálido y un gran bloque estadístico a la derecha con fondo claro y una imagen representativa.*

*   **Título Izquierdo**: `THE PRIVACY GAP`
*   **Párrafo Izquierdo**:
    ```text
    In global commerce, over $2.5 trillion remains unaddressed in the trade finance gap. 
    For medium-sized suppliers and lenders, this isn't just a number - it's a wall. 
    Standard public blockchains are not an option when full transparency leaks commercial 
    secrets, and legacy private databases lack atomic settlement.
    ```
*   **Bloque Estadístico Derecho (Right Column)**:
    *   **Número Grande**: `$2.5T`
    *   **Título del Indicador**: `Global Trade Finance Gap`
    *   **Texto Explicativo**:
        ```text
        In commercial finance, confidentiality is a luxury. Today's public ledgers expose 
        transaction metadata, leaking pricing power and business relationships directly 
        to competitors.
        ```
*   **Imagen**: Reemplazar la foto de las personas con celular por una foto de un puerto comercial (RWA) o terminal de trading.

---

## 🧠 Diapositiva 4: La Tecnología / Primitivas (How It Works)
*Mantiene el título a la izquierda, la introducción superior y el diseño de 3 columnas inferiores divididas por líneas verticales.*

*   **Título**: `CONFIDENTIALITY ON CHAIN`
*   **Introducción (Yanapa text equivalent)**:
    ```text
    CantonVault (Daml for "Conditional Commitments") is a privacy-first smart contract protocol 
    that turns sensitive financial agreements into secure, stakeholder-scoped assets. It runs 
    natively on Canton Network, requiring zero complex cryptography to protect the users.
    ```
*   **Columna 1: LOCAL WORKFLOWS** (reemplaza a Local OCR)
    ```text
    Creating a commitment proposal for a trade - a factoring invoice, or an OTC block - 
    and securing the details on-ledger between the signatories without any third-party visibility.
    ```
*   **Columna 2: SELECTIVE DISCLOSURE** (reemplaza a Transcreation)
    ```text
    This is not an all-or-nothing privacy model. Selective disclosure means revealing 
    the intent and value while hiding the parties' identities. It empowers clearing houses 
    to see the context only when a dispute is raised.
    ```
*   **Columna 3: ATOMIC SETTLEMENT** (reemplaza a Decode)
    ```text
    A financial settlement is usually slow and capital-intensive. CantonVault removes 
    settlement risk by linking actions to Canton Coin transfers. This means funds are released 
    instantly once delivery is verified on-ledger.
    ```

---

## 🎯 Diapositiva 5: Casos de Uso del Negocio (Key Use Cases)
*Mantiene el título superior, el subtítulo destacado y el flujo horizontal de 4 círculos conectados por una línea, con las descripciones de "El Riesgo" y "La Ayuda" debajo de cada uno.*

*   **Título Superior**: `ENFORCING PRIVACY ON LEDGER`
*   **Subtítulo**: *High-stakes confidentiality for institutional workflows.*
*   **Flujo de 4 Círculos**:
    *   **Círculo 1**: `INVOICE FINANCING`
        *   *The Risk*: Double-factoring and pricing leaks to major buyers.
        *   *CantonVault's Help*: Secures the invoice details only between the supplier and the financier. The buyer and the market see an empty ledger.
    *   **Círculo 2**: `OTC BLOCK TRADING`
        *   *The Risk*: Adverse market moves due to pre-execution size leakage.
        *   *CantonVault's Help*: Keeps trade agreements private between dealers. The clearing house only receives netting details on-demand.
    *   **Círculo 3**: `COMPLIANCE REPORTING`
        *   *The Risk*: Violating commercial secrets during audits or reviews.
        *   *CantonVault's Help*: Provides selective proof of trade compliance to auditors under Basel III and MiCA regulations without revealing active portfolios.
    *   **Círculo 4**: `STAKEHOLDER SCOPING`
        *   *The Tech*: Scoping visibility, not encrypting data.
        *   *CantonVault's Help*: Canton's native privacy model ensures that if a node is not a stakeholder or observer on a contract, the data never reaches its server.

---

## 🛠️ Diapositiva 6: Arquitectura y Componentes (Tech Stack)
*Mantiene la estructura de caja blanca sobre fondo cálido, con los números 01, 02, 03, 04 al lado izquierdo y una imagen de acción en el cuadrante inferior derecho.*

*   **Título Principal**: `A ROBUST ARCHITECTURE FOR CAPITAL MARKETS`
*   **Punto 01**:
    *   *Título*: `Daml Smart Contracts`
    *   *Texto*: Use stakeholder-scoped templates (`CommitmentProposal`, `CommitmentContract`, `DisputeCase`, `DisclosedRecord`) to mathematically enforce privacy boundaries.
*   **Punto 02**:
    *   *Título*: `Splice Token Integration`
    *   *Texto*: Settle transactions natively in Canton Coin (Amulet) using the `AllocationRequest` standard to remove counterparty settlement risk.
*   **Punto 03**:
    *   *Título*: `Postgres Query Service (PQS)`
    *   *Texto*: Enable high-frequency read access to the active contract set (ACS) via a read replica, keeping gRPC ledger traffic light.
*   **Punto 04**:
    *   *Título*: `Cloudflare Pages Frontend`
    *   *Texto*: Provide a responsive React/Vite dashboard featuring a real-time "Privacy Lab" split-screen demo for immediate user validation.
*   **Imagen (Bottom Right)**: Captura de pantalla de la interfaz de tu aplicación CantonVault (especialmente el split-screen de 4 cuadrantes del Privacy Lab).

---

## 🔒 Diapositiva 7: Cierre (Closing Slide)
*Mantiene el título grande superior, las frases principales contrastadas en el centro y el párrafo descriptivo inferior con fondo de color sólido.*

*   **Título Superior**: `CANTONVAULT`
*   **Frase Principal (Línea 1)**: `WE SECURE YOUR AGREEMENTS`
*   **Frase Principal (Línea 2)**: `PROPORCIONAMOS PRIVACIDAD REAL`
*   **Párrafo Descriptivo (Bottom)**:
    ```text
    Bridging the privacy gap in finance through Canton Network. Empowering 
    institutions to protect their pricing, portfolios, and relationships - 
    ENTIRELY CONFIDENTIAL.
    ```
