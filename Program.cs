namespace ToDoList
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);
            var app = builder.Build();

            // Serve default files (index.html) and static files from the web root
            app.UseDefaultFiles();
            app.UseStaticFiles();   

            app.Run();
        }
    }
}
