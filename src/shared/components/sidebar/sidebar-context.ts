import { createContext } from 'react';
import type { SidebarContextProps } from './sidebar.types';

export const SidebarContext = createContext<SidebarContextProps | null>(null);
