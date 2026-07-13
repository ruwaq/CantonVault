// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

declare module '*.yaml' {
    const content: Record<string, unknown>;
    export default content;
}

declare module '*.svg' {
    const content: string;
    export default content;
}
