import os
import sys
from sqlalchemy import create_engine, text, inspect
from config import Config

def print_table_contents():
    engine = create_engine(Config.SQLALCHEMY_DATABASE_URI)
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    if not tables:
        print("No tables found in the database.")
        return

    with engine.connect() as connection:
        for table in tables:
            print(f"\n{'='*50}")
            print(f" TABLE: {table}")
            print(f"{'='*50}")
            
            result = connection.execute(text(f"SELECT * FROM {table}"))
            rows = result.fetchall()
            
            if not rows:
                print(" (Table is empty)")
                continue
            
            columns = result.keys()
            print(f"Columns: {', '.join(columns)}")
            print(f"{'-'*50}")
            
            for row in rows:
                print(row)
            
            print(f"{'-'*50}")
            print(f"Total rows: {len(rows)}")

if __name__ == "__main__":
    print("--- Database Content Report ---")
    try:
        print_table_contents()
    except Exception as e:
        print(f"Error: {e}")
    print("\n--- End of Report ---")
