import { formatDisplayText } from '../../utils/helpers.js'

const Table = ({ columns = [], rows = [], emptyMessage = 'No records found', onRowClick }) => (
  <div className="overflow-hidden rounded-md border border-line bg-white shadow-[inset_5px_0_0_#0B5BA7]">
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        <thead className="bg-white text-slate-800">
          <tr className="h-11 border-b border-line">
            {columns.map((column, index) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-4 font-medium ${column.headerClassName || ''} ${
                  index < columns.length - 1 ? 'border-r border-line' : ''
                }`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-slate-500" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={row._id || row.id}
                className={`h-11 border-b border-line last:border-b-0 ${onRowClick ? 'cursor-pointer transition hover:bg-slate-50' : ''}`}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column, index) => (
                  <td
                    key={column.key}
                    className={`whitespace-nowrap px-4 py-3 align-middle text-slate-700 ${column.cellClassName || ''} ${
                      index < columns.length - 1 ? 'border-r border-line' : ''
                    }`}
                  >
                    {column.render ? column.render(row, rowIndex) : formatDisplayText(row[column.key])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)

export default Table
