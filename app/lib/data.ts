import postgres from 'postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  Status,
  LatestInvoice,
  LatestInvoiceRaw,
  Revenue,
} from './definitions';
import { formatCurrency, toStatus } from './utils';
import { customers, invoices, revenue } from './placeholder-data';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function fetchRevenue(): Promise<Revenue[]> {
  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    //local
    const data = revenue

    //sql
    // const data = await sql<Revenue[]>`SELECT * FROM revenue`;

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices(){
  try {
    //local
    const latestInvoices : LatestInvoice[] = invoices
      .sort((a,b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0,5)
      .map(invoice => {
        const customer = customers.find(c=>c.id == invoice.customer_id);
        return {
          id: invoice.id!,
          amount: formatCurrency(invoice.amount),
          name: customer!.name,
          image_url: customer!.image_url,
          email: customer!.email
        }
      })

    //sql
    // const data = await sql<LatestInvoiceRaw[]>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;

    // const latestInvoices = data.map((invoice) => ({
    //   ...invoice,
    //   amount: formatCurrency(invoice.amount),
    // }));
    return latestInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  try {
    //local
    const numberOfInvoices = invoices.length;
    const numberOfCustomers = customers.length;
    const totalPaidInvoices = invoices.length - 2;
    const totalPendingInvoices = invoices.length - totalPaidInvoices;

    //sql
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.

    // const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    // const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    // const invoiceStatusPromise = sql`SELECT
    //      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //      FROM invoices`;

    // const data = await Promise.all([
    //   invoiceCountPromise,
    //   customerCountPromise,
    //   invoiceStatusPromise,
    // ]);

    // const numberOfInvoices = Number(data[0][0].count ?? '0');
    // const numberOfCustomers = Number(data[1][0].count ?? '0');
    // const totalPaidInvoices = formatCurrency(data[2][0].paid ?? '0');
    // const totalPendingInvoices = formatCurrency(data[2][0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {

    //*local
    const filteredInvoices : InvoicesTable[] = 
      invoices.map(invoice=>{
        const customer = customers.find(c=>c.id == invoice.customer_id);
        const f : InvoicesTable = {
          id: invoice.id,
          customer_id: invoice.customer_id,
          name: customer!.name,
          email: customer!.email,
          image_url: customer!.image_url,
          date: invoice.date,
          amount: invoice.amount,
          status: toStatus(invoice.status) ?? "pending",
        };
        return f
      })
      .filter(inv => 
        inv.name.toLowerCase().includes(query.toLowerCase()) ||
        inv.email.toLowerCase().includes(query.toLowerCase()) ||
        inv.amount.toString().includes(query) ||
        inv.date.toString().includes(query) ||
        inv.status.toLowerCase().includes(query.toLowerCase())
      )
      .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(offset, offset + ITEMS_PER_PAGE);

    //*sql

    // const filteredInvoices = await sql<InvoicesTable[]>`
    //   SELECT
    //     invoices.id,
    //     invoices.amount,
    //     invoices.date,
    //     invoices.status,
    //     customers.name,
    //     customers.email,
    //     customers.image_url
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   WHERE
    //     customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`} OR
    //     invoices.amount::text ILIKE ${`%${query}%`} OR
    //     invoices.date::text ILIKE ${`%${query}%`} OR
    //     invoices.status ILIKE ${`%${query}%`}
    //   ORDER BY invoices.date DESC
    //   LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    // `;

    return filteredInvoices;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function fetchInvoicesPages(query: string) {
  try {
    //local
    const data = invoices.filter(inv =>
      inv.amount.toString().includes(query) ||
      inv.date.toString().includes(query) ||
      inv.status.toLowerCase().includes(query.toLowerCase())
    ).length
    +
    customers.filter(c=>
      c.email.toLowerCase().includes(query.toLowerCase()) ||
      c.name.toLowerCase().includes(query.toLowerCase())
    ).length;
    const totalPages = Math.ceil(data / ITEMS_PER_PAGE);

    //sql
    
    // const data = await sql`SELECT COUNT(*)
    // FROM invoices
    // JOIN customers ON invoices.customer_id = customers.id
    // WHERE
    //   customers.name ILIKE ${`%${query}%`} OR
    //   customers.email ILIKE ${`%${query}%`} OR
    //   invoices.amount::text ILIKE ${`%${query}%`} OR
    //   invoices.date::text ILIKE ${`%${query}%`} OR
    //   invoices.status ILIKE ${`%${query}%`}
    // `;

    // const totalPages = Math.ceil(Number(data[0].count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  try {

    const f  = invoices.find(i=> i.id === id)
    const data : InvoiceForm= invoices
      .map(inv=>{
        return{
          id: inv.id,
          customer_id: inv.customer_id,
          amount : inv.amount / 100,
          status: toStatus(inv.status) ?? "pending",
        }
      })
      .find(i=> i.id === id)!;

    //sql

    // const data = await sql<InvoiceForm[]>`
    //   SELECT
    //     invoices.id,
    //     invoices.customer_id,
    //     invoices.amount,
    //     invoices.status
    //   FROM invoices
    //   WHERE invoices.id = ${id};
    // `;

    // const invoice = data.map((invoice) => ({
    //   ...invoice,
    //   // Convert amount from cents to dollars
    //   amount: invoice.amount / 100,
    // }));

    // return invoice[0];

    return data
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    //local
    const customersAsc: CustomerField[] = customers.map(c=>{
      return {
        id: c.id,
        name: c.name,
      }
    })
    .sort(
      (a,b) => a.name.localeCompare(b.name)
    );

    //sql

    // const customersAsc = await sql<CustomerField[]>`
    //   SELECT
    //     id,
    //     name
    //   FROM customers
    //   ORDER BY name ASC
    // `;

    return customersAsc;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  try {
    const data = await sql<CustomersTableType[]>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}
