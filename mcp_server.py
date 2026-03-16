from mcp.server.fastmcp import FastMCP

# إنشاء سيرفر باسم FittnaClass
mcp = FastMCP("FittnaClass-Server")

@mcp.tool()
def get_project_context(file_name: str) -> str:
    """أداة تسمح لـ Stitch بقراءة محتوى ملفات المشروع"""
    try:
        with open(file_name, "r", encoding="utf-8") as f:
            return f.read()
    except Exception as e:
        return f"Error reading file: {str(e)}"

@mcp.tool()
def list_files() -> list:
    """أداة لعرض قائمة الملفات في مجلد المشروع الحالي"""
    import os
    return os.listdir(".")

if __name__ == "__main__":
    mcp.run()