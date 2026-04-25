package com.project.ems_server.config;

import com.project.ems_server.entity.Category;
import com.project.ems_server.entity.User;
import com.project.ems_server.entity.Venue;
import com.project.ems_server.enums.Role;
import com.project.ems_server.repository.CategoryRepository;
import com.project.ems_server.repository.UserRepository;
import com.project.ems_server.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final VenueRepository venueRepository;
    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;

    @Override
    public void run(String... args) throws Exception {
        if (venueRepository.count() == 0) {
            Venue auditorium = Venue.builder()
                    .name("Auditorium")
                    .capacity(500)
                    .location("Main Building")
                    .build();
            venueRepository.save(auditorium);

            Venue lectureHall1 = Venue.builder()
                    .name("Lecture Hall 1")
                    .capacity(100)
                    .location("Block A")
                    .build();
            venueRepository.save(lectureHall1);

            Venue lectureHall2 = Venue.builder()
                    .name("Lecture Hall 2")
                    .capacity(100)
                    .location("Block A")
                    .build();
            venueRepository.save(lectureHall2);

            Venue ictWorkshop = Venue.builder()
                    .name("ICT Workshop")
                    .capacity(50)
                    .location("IT Building")
                    .build();
            venueRepository.save(ictWorkshop);
        }

        if (categoryRepository.count() == 0) {
            Long adminId = userRepository.findByRole(Role.ADMIN).stream()
                    .findFirst()
                    .map(User::getId)
                    .orElse(null);

            if (adminId != null) {
                seedCategories(adminId);
            }
        }
    }

    private void seedCategories(Long adminId) {
        Category cultural = createParentCategory("Cultural", adminId);
        Category technical = createParentCategory("Technical", adminId);
        Category academic = createParentCategory("Academic", adminId);
        Category sports = createParentCategory("Sports", adminId);

        createSubCategories(cultural.getId(), adminId, List.of(
                "Music", "Dance", "Drama", "Art Exhibition", "Talent Show"
        ));
        createSubCategories(technical.getId(), adminId, List.of(
                "Hackathon", "Workshop", "Competition", "Exhibition"
        ));
        createSubCategories(academic.getId(), adminId, List.of(
                "Seminar", "Guest Lecture", "Research Conference", "Academic Session"
        ));
        createSubCategories(sports.getId(), adminId, List.of(
                "Football", "Cricket", "Basketball", "Badminton", "Athletics"
        ));
    }

    private Category createParentCategory(String name, Long adminId) {
        return categoryRepository.save(Category.builder()
                .name(name)
                .parentId(null)
                .createdBy(adminId)
                .createdAt(LocalDateTime.now())
                .build());
    }

    private void createSubCategories(Long parentId, Long adminId, List<String> names) {
        List<Category> subCategories = names.stream()
                .map(name -> Category.builder()
                        .name(name)
                        .parentId(parentId)
                        .createdBy(adminId)
                        .createdAt(LocalDateTime.now())
                        .build())
                .collect(Collectors.toList());

        categoryRepository.saveAll(subCategories);
    }
}
