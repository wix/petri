package com.wixpress.guineapig.web;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.wixpress.guineapig.entities.ui.*;
import com.wixpress.guineapig.services.GuineapigExperimentMgmtService;
import com.wixpress.guineapig.services.NoOpFilterAdapterExtender;
import com.wixpress.guineapig.services.SpecService;
import com.wixpress.guineapig.spi.HardCodedScopesProvider;
import com.wixpress.petri.experiments.domain.Experiment;
import com.wixpress.petri.experiments.domain.ExperimentSpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import javax.servlet.http.HttpSession;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import static com.google.common.collect.Iterables.filter;
import static com.google.common.collect.Lists.newArrayList;
import static com.wixpress.guineapig.entities.ui.UiExperimentBuilder.anUiExperiment;
import static com.wixpress.petri.experiments.domain.ExperimentPredicates.IssNotExperimentWithId.isNotExperimentWithId;


@Controller
public class ExperimentsController extends BaseController {

    private GuineapigExperimentMgmtService experimentService;
    private SpecService specService;
    private HardCodedScopesProvider hardCodedScopesProvider;
    private ExperimentConverter converter;


    @Autowired
    public ExperimentsController(SpecService specService, GuineapigExperimentMgmtService experimentService, HardCodedScopesProvider hardCodedScopesProvider) {
        this.experimentService = experimentService;
        this.specService = specService;
        this.hardCodedScopesProvider = hardCodedScopesProvider;
        converter = new ExperimentConverter(new AlwaysTrueIsEditablePredicate(), new NoOpFilterAdapterExtender());
    }

    @RequestMapping(value = "/ExperimentSkeleton", method = RequestMethod.GET)
    @ResponseBody
    public GuineapigResult getExperimentSkeleton() throws Exception {
        return success(anUiExperiment().build());
    }

    @RequestMapping(value = "/Experiments", method = RequestMethod.GET)
    @ResponseBody
    public GuineapigResult getAllExperiments() throws Exception {
        try {
            List<UiExperiment> res = new ArrayList<>();
            List<Experiment> allExperiments = experimentService.getAllExperiments();
            for (Experiment experiment : allExperiments) {
                res.add(converter.convert(experiment));
            }
            return success(res);
        } catch (JsonProcessingException | ClassNotFoundException e) {
            return failure(e.getMessage());
        }
    }

    @RequestMapping(value = "/Experiments", method = {RequestMethod.POST})
    @ResponseBody
    public GuineapigResult newExperiment(@RequestBody final UiExperiment uiExperiment, final HttpSession session) throws Exception {
        try {
            Experiment experiment = convertToExperiment(uiExperiment, getUser(session).getEmail(), true);
            return success(experimentService.newExperiment(experiment.getExperimentSnapshot()));
        } catch (IOException | DataAccessException | IllegalArgumentException e) {
            return failure(e.getMessage());
        }
    }

    @RequestMapping(value = "/Experiment/{experimentId}", method = {RequestMethod.PUT})
    @ResponseBody
    public GuineapigResult updateExperiment(@RequestBody final UiExperiment uiExperiment, final HttpSession session) throws Exception {
        try {
            String userEmail = getUser(session).getEmail();
            Experiment experiment = convertToExperiment(uiExperiment, userEmail, false);
            return success(experimentService.updateExperiment(experiment, userEmail));
        } catch (IOException | DataAccessException | IllegalArgumentException e) {
            return failure(e.getMessage());
        }
    }

    @RequestMapping(value = "/Experiment/{experimentId}/terminate", method = {RequestMethod.POST}, consumes = {"text/plain"})
    @ResponseBody
    public GuineapigResult terminateExperiment(
            @PathVariable("experimentId") final int experimentId, @RequestBody final String comment,final HttpSession session) throws Exception {
        try {
            Experiment experiment = experimentService.getExperimentById(experimentId);
            List<Experiment> allExperiments = experimentService.getAllExperiments();
            List<Experiment> allOtherExperiments = newArrayList(filter(allExperiments, isNotExperimentWithId(experimentId)));
            boolean shouldSuggestToDeleteSpec = experiment.isFromSpec() && !specService.isSpecActive(experiment.getKey(), allOtherExperiments);
            boolean success = experimentService.terminateExperiment(experimentId, comment, getUser(session).getEmail());
            return success(new TerminateExperimentResult(success, shouldSuggestToDeleteSpec, experiment.getKey()));
        } catch (JsonProcessingException | ClassNotFoundException e) {
            return failure(e.getMessage());
        }
    }

    @RequestMapping(value = "/Experiment/{experimentId}/pause", method = {RequestMethod.POST}, consumes = {"text/plain"})
    @ResponseBody
    public GuineapigResult pauseExperiment(@PathVariable("experimentId") final int experimentId, @RequestBody final String comment, final HttpSession session) throws Exception {
        return success(experimentService.pauseExperiment(experimentId, comment, getUser(session).getEmail()));
    }

    @RequestMapping(value = "/Experiment/{experimentId}/resume", method = {RequestMethod.POST}, consumes = {"text/plain"})
    @ResponseBody
    public GuineapigResult resumeExperiment(@PathVariable("experimentId") final int experimentId, @RequestBody final String comment, final HttpSession session) throws Exception {
        return success(experimentService.resumeExperiment(experimentId, comment, getUser(session).getEmail()));
    }

    @RequestMapping(value = "/Experiment/{experimentId}", method = RequestMethod.GET)
    @ResponseBody
    public GuineapigResult getExperiment(@PathVariable("experimentId") final int experimentId) throws Exception {
        Experiment experiment = experimentService.getExperimentById(experimentId);
        try {
            return success(converter.convert(experiment));
        } catch (ClassNotFoundException | JsonProcessingException e) {
            return failure(e.getMessage());
        }
    }

    @RequestMapping(value = "/Experiment/History/{experimentId}", method = RequestMethod.GET)
    @ResponseBody
    public GuineapigResult getHistoryById(@PathVariable("experimentId") final int experimentId) throws Exception {
        List<Experiment> history = experimentService.getHistoryById(experimentId);
        List<UiExperiment> retVal = new ArrayList<>();
        try {
            for (Experiment experiment : history) {
                retVal.add(converter.convert(experiment));
            }
        } catch (ClassNotFoundException | JsonProcessingException e) {
            return failure(e.getMessage());
        }
        return success(retVal);
    }

    @RequestMapping(value = "/experiments/editStatus", method = {RequestMethod.GET})
    @ResponseBody
    public GuineapigResult<Boolean> getEditStatus() throws JsonProcessingException {
        return success(true);
    }

    @RequestMapping(value = "/Experiments/report/{experimentId}", method = RequestMethod.GET)
    @ResponseBody
    public GuineapigResult getExperimentsReport(@PathVariable("experimentId") final int experimentId) throws Exception {
        return success(experimentService.getExperimentReport(experimentId));
    }


    Experiment convertToExperiment(UiExperiment uiExperiment, String user, boolean isNew) throws IOException {
        ExperimentSpec spec = experimentService.getSpecForExperiment(uiExperiment.getKey());
        return UiExperimentConverter.toExperiment(uiExperiment,
                isNew,
                spec,
                hardCodedScopesProvider.getHardCodedScopesList(),
                new NoOpFilterAdapterExtender(),
                user);
    }
}
