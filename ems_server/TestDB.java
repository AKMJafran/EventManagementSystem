import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class TestDB {
    public static void main(String[] args) {
        String url = "jdbc:mysql://localhost:3306/ems_database?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";
        String user = "root";
        String pass = "HAzi@1915";

        try (Connection conn = DriverManager.getConnection(url, user, pass);
             Statement stmt = conn.createStatement()) {
            
            System.out.println("--- USERS ---");
            ResultSet rs = stmt.executeQuery("SELECT id, email, role, is_active FROM users");
            while (rs.next()) {
                System.out.println(rs.getInt("id") + " | " + rs.getString("email") + " | " + rs.getString("role") + " | " + rs.getBoolean("is_active"));
            }

            System.out.println("\n--- LECTURER PROFILES ---");
            ResultSet rs2 = stmt.executeQuery("SELECT id, user_id, staff_id FROM lecturer_profiles");
            while (rs2.next()) {
                System.out.println(rs2.getInt("id") + " | user_id=" + rs2.getInt("user_id") + " | staff_id=" + rs2.getString("staff_id"));
            }
            
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
