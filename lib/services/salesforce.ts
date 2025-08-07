/**
 * Salesforce Service - Direct Connection
 * This service handles direct Salesforce API connections when backend is not available
 */

import jsforce from 'jsforce';
import { getSecretsManager } from './secrets-manager';

export interface SalesforceContact {
  Id: string;
  Name: string;
  FirstName?: string;
  LastName?: string;
  Email?: string;
  Phone?: string;
  MobilePhone?: string;
  AccountId?: string;
  Account?: {
    Name: string;
  };
  MailingStreet?: string;
  MailingCity?: string;
  MailingState?: string;
  MailingPostalCode?: string;
  MailingCountry?: string;
  LastModifiedDate?: string;
  CreatedDate?: string;
}

export interface SalesforceAccount {
  Id: string;
  Name: string;
  Type?: string;
  Industry?: string;
  Phone?: string;
  Website?: string;
  BillingStreet?: string;
  BillingCity?: string;
  BillingState?: string;
  BillingPostalCode?: string;
  BillingCountry?: string;
  Description?: string;
  NumberOfEmployees?: number;
  AnnualRevenue?: number;
  LastModifiedDate?: string;
  CreatedDate?: string;
}

class SalesforceService {
  private conn: jsforce.Connection | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Get credentials from AWS Secrets Manager
      const secretsManager = getSecretsManager();
      const secrets = await secretsManager.getSecrets();
      
      if (!secrets.salesforce) {
        console.warn('Salesforce credentials not configured in Secrets Manager');
        return;
      }
      
      const { username, password, securityToken } = secrets.salesforce;
      const loginUrl = secrets.salesforce.instanceUrl || 'https://login.salesforce.com';

      if (!username || !password) {
        console.warn('Salesforce credentials not configured');
        return;
      }

      this.conn = new jsforce.Connection({
        loginUrl: loginUrl
      });

      await this.conn.login(username, password + securityToken);
      this.isInitialized = true;
      console.log('Salesforce connection established');
    } catch (error) {
      console.error('Failed to initialize Salesforce connection:', error);
      throw error;
    }
  }

  async searchContacts(query: string, limit: number = 10): Promise<SalesforceContact[]> {
    if (!this.conn) {
      throw new Error('Salesforce connection not initialized');
    }

    try {
      const result = await this.conn.query<SalesforceContact>(
        `SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone, 
         AccountId, Account.Name, MailingStreet, MailingCity, MailingState, 
         MailingPostalCode, MailingCountry, LastModifiedDate, CreatedDate
         FROM Contact 
         WHERE Name LIKE '%${query}%' 
         OR Email LIKE '%${query}%' 
         OR Phone LIKE '%${query}%'
         OR MobilePhone LIKE '%${query}%'
         ORDER BY LastModifiedDate DESC 
         LIMIT ${limit}`
      );

      return result.records || [];
    } catch (error) {
      console.error('Failed to search contacts:', error);
      return [];
    }
  }

  async searchAccounts(query: string, limit: number = 10): Promise<SalesforceAccount[]> {
    if (!this.conn) {
      throw new Error('Salesforce connection not initialized');
    }

    try {
      const result = await this.conn.query<SalesforceAccount>(
        `SELECT Id, Name, Type, Industry, Phone, Website, 
         BillingStreet, BillingCity, BillingState, BillingPostalCode, 
         BillingCountry, Description, NumberOfEmployees, AnnualRevenue,
         LastModifiedDate, CreatedDate
         FROM Account 
         WHERE Name LIKE '%${query}%' 
         OR Phone LIKE '%${query}%'
         ORDER BY LastModifiedDate DESC 
         LIMIT ${limit}`
      );

      return result.records || [];
    } catch (error) {
      console.error('Failed to search accounts:', error);
      return [];
    }
  }

  async getContact(id: string): Promise<SalesforceContact | null> {
    if (!this.conn) {
      throw new Error('Salesforce connection not initialized');
    }

    try {
      const result = await this.conn.sobject('Contact').retrieve(id) as SalesforceContact;
      return result;
    } catch (error) {
      console.error('Failed to get contact:', error);
      return null;
    }
  }

  async getAccount(id: string): Promise<SalesforceAccount | null> {
    if (!this.conn) {
      throw new Error('Salesforce connection not initialized');
    }

    try {
      const result = await this.conn.sobject('Account').retrieve(id) as SalesforceAccount;
      return result;
    } catch (error) {
      console.error('Failed to get account:', error);
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      if (!this.conn) {
        await this.initialize();
      }
      
      if (!this.conn) return false;

      // Try a simple query to test the connection
      await this.conn.query('SELECT Id FROM Contact LIMIT 1');
      return true;
    } catch (error) {
      console.error('Salesforce connection test failed:', error);
      return false;
    }
  }
}

export const salesforceService = new SalesforceService();